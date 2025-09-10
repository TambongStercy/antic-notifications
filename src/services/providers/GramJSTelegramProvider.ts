import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import bigInt from 'big-integer';
import { MessageRepository } from '@/database/repositories/MessageRepository';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
import { ServiceType } from '@/types';
import { config } from '@/config/environment';
import logger from '@/utils/logger';
import { EventEmitter } from 'events';
import { validateTelegramPhoneNumber, sanitizePhoneNumber } from '@/utils/phoneNumber';

export interface SendResult {
    success: boolean;
    externalMessageId?: string;
    errorMessage?: string;
}

export interface TelegramCredentials {
    apiId: number;
    apiHash: string;
    phoneNumber: string;
    sessionString?: string;
}

export interface GramJSTelegramProviderEvents {
    on(event: 'auth-required', listener: (authData: { phoneCodeHash: string }) => void): this;
    on(event: 'code-required', listener: () => void): this;
    on(event: 'password-required', listener: () => void): this;
    on(event: 'authenticated', listener: () => void): this;
    on(event: 'connected', listener: () => void): this;
    on(event: 'disconnected', listener: (reason?: string) => void): this;
}

export class GramJSTelegramProvider extends (EventEmitter as { new(): EventEmitter & GramJSTelegramProviderEvents }) {
    private messageRepository: MessageRepository;
    private statusRepository: ServiceStatusRepository;
    private client: TelegramClient | null = null;
    private configured = false;
    private connected = false;
    private credentials: TelegramCredentials | null = null;
    private authInProgress = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;

    constructor(
        deps?: {
            messageRepository?: MessageRepository;
            statusRepository?: ServiceStatusRepository;
        }
    ) {
        super();
        this.messageRepository = deps?.messageRepository ?? new MessageRepository();
        this.statusRepository = deps?.statusRepository ?? new ServiceStatusRepository();

        // Set max listeners to prevent memory leak warnings
        this.setMaxListeners(20);

        // Handle uncaught Telegram errors gracefully
        this.setupErrorHandlers();
    }

    public async configureCredentials(credentials: TelegramCredentials): Promise<void> {
        // Load apiId/apiHash from env if not provided; phoneNumber must be provided by admin
        const apiId = credentials.apiId ?? (typeof config.telegram.apiId === 'number' ? config.telegram.apiId : undefined);
        const apiHash = credentials.apiHash ?? config.telegram.apiHash;
        const phoneNumber = credentials.phoneNumber;

        if (!apiId || !apiHash || !phoneNumber) {
            throw new Error('API ID, API Hash (from env), and phone number are required');
        }

        // Validate API ID (should be a number)
        if (typeof apiId !== 'number' || apiId <= 0) {
            throw new Error('Invalid API ID');
        }

        // Validate API Hash format
        if (typeof apiHash !== 'string' || apiHash.length < 32) {
            throw new Error('Invalid API Hash');
        }

        // Validate phone number format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
            throw new Error('Invalid phone number format');
        }

        try {
            // Save credentials to database (store phone and resolved apiId/apiHash)
            const resolved: TelegramCredentials = {
                apiId,
                apiHash,
                phoneNumber,
                ...(credentials.sessionString ? { sessionString: credentials.sessionString } : {})
            } as TelegramCredentials;
            await this.statusRepository.setTelegramCredentials(resolved);
            this.credentials = resolved;
            this.configured = true;
            logger.info('Telegram credentials configured');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Configuration failed';
            logger.error('Telegram credentials configuration failed:', errorMessage);
            throw new Error(`Failed to configure credentials: ${errorMessage}`);
        }
    }

    public async init(): Promise<void> {
        if (!this.configured || !this.credentials) {
            throw new Error('Telegram not configured');
        }

        try {
            const stringSession = new StringSession(this.credentials.sessionString || '');

            // Disable Telegram's internal logging completely
            const originalConsoleLog = console.log;
            const originalConsoleError = console.error;
            const originalConsoleWarn = console.warn;

            // Temporarily disable all console output during client creation
            console.log = () => { };
            console.error = () => { };
            console.warn = () => { };

            this.client = new TelegramClient(stringSession, this.credentials.apiId, this.credentials.apiHash, {
                connectionRetries: 3, // Reduced retries to prevent spam
                retryDelay: 5000, // 5 second delay between retries
                timeout: 30000, // 30 second timeout
                requestRetries: 2, // Reduced request retries
                floodSleepThreshold: 60, // Wait 60 seconds for flood errors
                useWSS: false, // Use TCP instead of WebSocket for better stability
                testServers: false, // Use production servers
                autoReconnect: true, // Enable auto-reconnect
                maxConcurrentDownloads: 1, // Limit concurrent operations
                // baseLogger removed - we handle logging suppression at the process level
            });

            // Restore console methods
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;

            logger.info('Telegram client initialized');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
            logger.error('Telegram client initialization failed:', errorMessage);
            throw new Error(`Failed to initialize: ${errorMessage}`);
        }
    }

    public async connect(): Promise<void> {
        if (!this.client) {
            await this.init();
        }

        if (!this.client) {
            throw new Error('Client not initialized');
        }

        try {
            this.authInProgress = true;

            // Error suppression is handled at the process level by GlobalErrorSuppressor
            // No need to override client emit methods

            await this.client.start({
                phoneNumber: async () => {
                    this.emit('auth-required', { phoneCodeHash: '' });
                    return this.credentials!.phoneNumber;
                },
                password: async () => {
                    this.emit('password-required');
                    return new Promise((resolve) => {
                        // This will be resolved when the user provides the password
                        this.once('password-provided', resolve);
                    });
                },
                phoneCode: async () => {
                    this.emit('code-required');
                    return new Promise((resolve) => {
                        // This will be resolved when the user provides the code
                        this.once('code-provided', resolve);
                    });
                },
                onError: (err) => {
                    // Only log significant errors, not network timeouts
                    if (!err.message?.includes('TIMEOUT') && !err.message?.includes('Not connected')) {
                        logger.error('Telegram auth error:', err);
                    } else {
                        logger.debug('Telegram network error (will retry):', err.message);
                    }
                    this.authInProgress = false;
                },
            });

            // Save the session string for future use
            const sessionString = (this.client.session as StringSession).save();
            if (this.credentials) {
                this.credentials.sessionString = sessionString;
                await this.statusRepository.setTelegramCredentials(this.credentials);
            }

            await this.statusRepository.markAsConnected('telegram');
            this.connected = true;
            this.authInProgress = false;
            this.emit('authenticated');
            this.emit('connected');

            logger.info('Telegram client connected successfully');
        } catch (error) {
            this.authInProgress = false;
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            logger.error('Telegram connection failed:', errorMessage);
            await this.statusRepository.markAsDisconnected('telegram');
            throw new Error(`Failed to connect: ${errorMessage}`);
        }
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.client) {
                // Gracefully disconnect
                await this.client.disconnect();
                this.client = null;
            }
            await this.statusRepository.markAsDisconnected('telegram');
            this.connected = false;
            this.reconnectAttempts = 0; // Reset reconnect attempts
            this.emit('disconnected');
            logger.info('Telegram client disconnected');
        } catch (error) {
            // Don't log network errors during disconnect
            if (!(error instanceof Error) || (!error.message?.includes('TIMEOUT') && !error.message?.includes('Not connected'))) {
                logger.error('Error disconnecting Telegram client:', error);
            }
            await this.statusRepository.markAsDisconnected('telegram');
            this.connected = false;
            this.reconnectAttempts = 0;
            this.emit('disconnected');
        }
    }

    // Add method to handle reconnection gracefully
    public async handleReconnection(): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.warn('Max Telegram reconnection attempts reached, stopping auto-reconnect');
            return;
        }

        this.reconnectAttempts++;
        logger.info(`Telegram reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

        try {
            if (this.client && this.canAutoConnect()) {
                // Try to reconnect with existing session
                await this.connect();
                this.reconnectAttempts = 0; // Reset on success
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.warn(`Telegram reconnection attempt ${this.reconnectAttempts} failed:`, errorMessage);

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                // Wait before next attempt
                setTimeout(() => this.handleReconnection(), 10000 * this.reconnectAttempts);
            }
        }
    }

    // Methods to provide auth data from the UI
    public providePhoneCode(code: string): void {
        this.emit('code-provided', code);
    }

    public providePassword(password: string): void {
        this.emit('password-provided', password);
    }

    public isConfigured(): boolean {
        return this.configured;
    }

    public isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    public isAuthInProgress(): boolean {
        return this.authInProgress;
    }

    public canAutoConnect(): boolean {
        return !!(this.credentials && this.credentials.sessionString && this.credentials.sessionString.length > 0);
    }

    public async sendText(recipient: string, message: string, metadata?: Record<string, any>): Promise<SendResult> {
        // Input validation
        if (!recipient || typeof recipient !== 'string') {
            return { success: false, errorMessage: 'Recipient is required (phone number, @username, or chat ID)' };
        }
        
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return { success: false, errorMessage: 'Message content is required' };
        }

        // Validate recipient using utility function
        const recipientValidation = validateTelegramPhoneNumber(recipient);
        if (!recipientValidation.isValid) {
            return { success: false, errorMessage: recipientValidation.error || 'Invalid recipient format' };
        }

        try {
            // Store sanitized recipient in database
            const sanitizedRecipient = recipientValidation.formatted || recipientValidation.cleanNumber;
            const msg = await this.messageRepository.create({
                service: 'telegram' as ServiceType,
                recipient: sanitizedRecipient,
                message: message.trim(),
                status: 'pending',
                timestamp: new Date(),
                metadata: metadata ?? {},
                requestedBy: (metadata && (metadata as any).requestedBy) || (global as any).__requestedBy || 'admin',
            } as any);

            // Connection validation
            if (!this.connected || !this.client) {
                await this.messageRepository.markAsFailed(msg.id, 'Telegram not connected. Please authenticate and connect first.');
                return { success: false, errorMessage: 'Telegram not connected. Please authenticate first.' };
            }

            try {
                // Validate message length (Telegram limit is 4096 characters)
                if (message.length > 4096) {
                    throw new Error('Message too long. Maximum length is 4,096 characters for Telegram.');
                }

                // Parse recipient type and resolve entity
                let entity: any;
                const cleanRecipient = recipientValidation.cleanNumber;
                const isUsername = cleanRecipient.startsWith('@');
                const isNegativeChatId = cleanRecipient.startsWith('-');
                const isLargeChatId = /^\d+$/.test(cleanRecipient) && cleanRecipient.length > 15;
                const isChatId = isNegativeChatId || isLargeChatId;
                const isPhone = !isUsername && !isChatId && cleanRecipient.startsWith('+');

                logger.info(`Resolving Telegram entity for: ${sanitizedRecipient}`);

                if (isPhone) {
                    try {
                        // Use sanitized phone number
                        const phone = cleanRecipient.startsWith('+') ? cleanRecipient : `+${cleanRecipient}`;

                        // Import contact to ensure resolvable entity
                        const importResult: any = await this.client.invoke(
                            new Api.contacts.ImportContacts({
                                contacts: [
                                    new Api.InputPhoneContact({
                                        clientId: bigInt(Date.now()),
                                        phone,
                                        firstName: 'Contact',
                                        lastName: ''
                                    })
                                ]
                            })
                        );

                        // Find the imported user entity
                        const imported = importResult?.users?.[0];
                        if (!imported) {
                            throw new Error(`Phone number ${sanitizedRecipient} is not registered on Telegram or cannot be imported`);
                        }

                        entity = imported;
                    } catch (importErr) {
                        const importError = importErr instanceof Error ? importErr.message : 'Unable to import contact';
                        throw new Error(`Unable to resolve phone number on Telegram: ${importError}`);
                    }
                } else if (isUsername) {
                    try {
                        entity = await this.client.getEntity(cleanRecipient);
                    } catch (entityErr) {
                        throw new Error(`Username ${cleanRecipient} not found on Telegram`);
                    }
                } else if (isChatId) {
                    try {
                        const chatId = isNegativeChatId ? parseInt(cleanRecipient, 10) : cleanRecipient;
                        entity = await this.client.getEntity(chatId);
                    } catch (entityErr) {
                        throw new Error(`Chat ID ${cleanRecipient} not found or not accessible`);
                    }
                } else {
                    // Fallback attempt
                    try {
                        entity = await this.client.getEntity(cleanRecipient);
                    } catch (entityErr) {
                        throw new Error(`Unable to resolve recipient: ${cleanRecipient}`);
                    }
                }

                // Send message with timeout
                logger.info(`Sending Telegram message to entity: ${entity.className}`);
                const sendPromise = this.client.sendMessage(entity, {
                    message: message.trim()
                });

                // Add timeout to prevent hanging
                const timeoutPromise = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Message send timeout after 30 seconds')), 30000)
                );

                const sentMessage = await Promise.race([sendPromise, timeoutPromise]);

                if (sentMessage && sentMessage.id) {
                    const messageId = sentMessage.id.toString();
                    await this.messageRepository.markAsSent(msg.id, messageId);
                    logger.info(`Telegram message sent successfully to ${sanitizedRecipient} with ID: ${messageId}`);
                    return { 
                        success: true, 
                        externalMessageId: messageId 
                    };
                } else {
                    throw new Error('Message sent but no response received from Telegram');
                }

            } catch (sendError) {
                let errorMessage = 'Failed to send Telegram message';
                
                if (sendError instanceof Error) {
                    errorMessage = sendError.message;
                    
                    // Handle specific Telegram errors
                    if (errorMessage.includes('USER_NOT_FOUND')) {
                        errorMessage = 'Recipient not found on Telegram. Please check the phone number/username.';
                    } else if (errorMessage.includes('PHONE_NOT_OCCUPIED')) {
                        errorMessage = 'Phone number is not registered on Telegram.';
                    } else if (errorMessage.includes('USERNAME_NOT_OCCUPIED')) {
                        errorMessage = 'Username does not exist on Telegram.';
                    } else if (errorMessage.includes('FLOOD_WAIT')) {
                        const match = errorMessage.match(/FLOOD_WAIT_(\d+)/);
                        const seconds = match ? match[1] : '60';
                        errorMessage = `Rate limit exceeded. Please wait ${seconds} seconds before trying again.`;
                    } else if (errorMessage.includes('timeout')) {
                        errorMessage = 'Message send timeout. Please check your connection and try again.';
                    } else if (errorMessage.includes('AUTH_KEY_UNREGISTERED')) {
                        errorMessage = 'Telegram session expired. Please re-authenticate.';
                    }
                }

                logger.error('Telegram send error:', {
                    error: errorMessage,
                    originalError: sendError instanceof Error ? sendError.stack : sendError,
                    recipient: sanitizedRecipient,
                    connected: this.connected,
                    clientExists: !!this.client
                });

                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            logger.error('Telegram send failed (database error):', { 
                error: errorMessage,
                recipient: recipientValidation.formatted || recipient
            });
            return { success: false, errorMessage: `Database error: ${errorMessage}` };
        }
    }

    public async sendFile(recipient: string, filePath: string, caption?: string, metadata?: Record<string, any>): Promise<SendResult> {
        try {
            const msg = await this.messageRepository.create({
                service: 'telegram' as ServiceType,
                recipient,
                message: caption || 'File message',
                status: 'pending',
                timestamp: new Date(),
                metadata: { ...metadata, filePath },
            } as any);

            if (!this.connected || !this.client) {
                await this.messageRepository.markAsFailed(msg.id, 'Telegram not connected');
                return { success: false, errorMessage: 'Telegram not connected' };
            }

            try {
                let entity;
                if (recipient.startsWith('@')) {
                    entity = await this.client.getEntity(recipient);
                } else if (/^\d+$/.test(recipient)) {
                    entity = await this.client.getEntity(parseInt(recipient, 10));
                } else {
                    entity = await this.client.getEntity(recipient);
                }

                const sendOptions: any = {
                    file: filePath
                };

                if (caption) {
                    sendOptions.caption = caption;
                }

                const sentMessage = await this.client.sendFile(entity, sendOptions);

                await this.messageRepository.markAsSent(msg.id, sentMessage.id.toString());
                return { success: true, externalMessageId: sentMessage.id.toString() };
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send file';
                logger.error('Telegram file send error:', { error: errorMessage, recipient, filePath });
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Telegram file send failed', { error: errorMessage });
            return { success: false, errorMessage };
        }
    }

    public async loadExistingCredentials(): Promise<void> {
        try {
            const credentials = await this.statusRepository.getTelegramCredentials();
            if (credentials) {
                this.credentials = credentials;
                this.configured = true;
                logger.info('Loaded existing Telegram credentials from database');
            }
        } catch (error) {
            logger.error('Failed to load existing Telegram credentials:', error);
        }
    }

    private setupErrorHandlers(): void {
        // Handle unhandled rejections from Telegram client using event listeners
        process.on('unhandledRejection', (reason: any) => {
            if (reason && typeof reason === 'object' && 'message' in reason) {
                const message = (reason as Error).message;

                // Suppress common Telegram network errors
                if (message.includes('TIMEOUT') ||
                    message.includes('Not connected') ||
                    message.includes('Connection closed') ||
                    message.includes('Reconnecting')) {
                    // Suppress these errors by not logging them
                    return;
                }
            }

            // Log other unhandled rejections
            logger.error('Unhandled rejection in Telegram provider:', reason);
        });

        // Handle uncaught exceptions from Telegram client
        process.on('uncaughtException', (error: Error) => {
            if (error.message.includes('TIMEOUT') ||
                error.message.includes('Not connected') ||
                error.message.includes('Connection closed') ||
                error.message.includes('Reconnecting')) {
                // Suppress these errors
                return;
            }

            // Log other uncaught exceptions
            logger.error('Uncaught exception in Telegram provider:', error);
        });
    }

    // Get connection status for frontend
    public getConnectionStatus(): {
        configured: boolean;
        connected: boolean;
        authInProgress: boolean;
        canAutoConnect: boolean;
        reconnectAttempts: number;
    } {
        return {
            configured: this.configured,
            connected: this.connected,
            authInProgress: this.authInProgress,
            canAutoConnect: this.canAutoConnect(),
            reconnectAttempts: this.reconnectAttempts,
        };
    }
}

export default GramJSTelegramProvider;
