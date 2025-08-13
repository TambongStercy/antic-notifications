import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import bigInt from 'big-integer';
import { MessageRepository } from '@/database/repositories/MessageRepository';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
import { ServiceType } from '@/types';
import { config } from '@/config/environment';
import logger from '@/utils/logger';
import { EventEmitter } from 'events';

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

    constructor(
        deps?: {
            messageRepository?: MessageRepository;
            statusRepository?: ServiceStatusRepository;
        }
    ) {
        super();
        this.messageRepository = deps?.messageRepository ?? new MessageRepository();
        this.statusRepository = deps?.statusRepository ?? new ServiceStatusRepository();
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

            this.client = new TelegramClient(stringSession, this.credentials.apiId, this.credentials.apiHash, {
                connectionRetries: 5,
            });

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
                    logger.error('Telegram auth error:', err);
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
                await this.client.disconnect();
                this.client = null;
            }
            await this.statusRepository.markAsDisconnected('telegram');
            this.connected = false;
            this.emit('disconnected');
            logger.info('Telegram client disconnected');
        } catch (error) {
            logger.error('Error disconnecting Telegram client:', error);
            await this.statusRepository.markAsDisconnected('telegram');
            this.connected = false;
            this.emit('disconnected');
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
        try {
            const msg = await this.messageRepository.create({
                service: 'telegram' as ServiceType,
                recipient,
                message,
                status: 'pending',
                timestamp: new Date(),
                metadata: metadata ?? {},
                requestedBy: (metadata && (metadata as any).requestedBy) || (global as any).__requestedBy || 'admin',
            } as any);

            if (!this.connected || !this.client) {
                await this.messageRepository.markAsFailed(msg.id, 'Telegram not connected');
                return { success: false, errorMessage: 'Telegram not connected' };
            }

            try {
                // Parse recipient - prefer phone number, then @username, then numeric ID
                let entity: any;
                const isPhone = /^\+?[1-9]\d{1,14}$/.test(recipient);
                const isUsername = recipient.startsWith('@');
                const isNumericId = /^\d+$/.test(recipient);

                if (isPhone) {
                    try {
                        // Normalize phone (remove spaces/dashes)
                        const phone = recipient.replace(/[^\d+]/g, '');

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
                            throw new Error('Phone number is not on Telegram or cannot be imported');
                        }

                        // Use the returned user as the target entity
                        entity = imported;
                    } catch (importErr) {
                        throw new Error('Unable to resolve phone number on Telegram');
                    }
                } else if (isUsername) {
                    entity = await this.client.getEntity(recipient);
                } else if (isNumericId) {
                    entity = await this.client.getEntity(parseInt(recipient, 10));
                } else {
                    // Fallback attempt
                    entity = await this.client.getEntity(recipient);
                }

                const sentMessage = await this.client.sendMessage(entity, {
                    message: message
                });

                await this.messageRepository.markAsSent(msg.id, sentMessage.id.toString());
                return { success: true, externalMessageId: sentMessage.id?.toString?.() || String(sentMessage?.id || '') };
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send message';
                logger.error('Telegram send error:', { error: errorMessage, recipient });
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Telegram send failed', { error: errorMessage });
            return { success: false, errorMessage };
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
}

export default GramJSTelegramProvider;