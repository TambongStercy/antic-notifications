import makeWASocket, {
    useMultiFileAuthState,
    WASocket,
    AuthenticationState
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
import { MessageRepository } from '@/database/repositories/MessageRepository';
import { ServiceType } from '@/types';
import { config } from '@/config/environment';
import logger from '@/utils/logger';
import { validateWhatsAppPhoneNumber, formatWhatsAppJID } from '@/utils/phoneNumber';

export interface SendResult {
    success: boolean;
    externalMessageId?: string;
    errorMessage?: string;
}

export class BaileysWhatsAppProvider {
    private statusRepository: ServiceStatusRepository;
    private messageRepository: MessageRepository;
    private socket: WASocket | null = null;
    private initialized = false;
    private connected = false;
    private authState: AuthenticationState | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;

    constructor(
        deps?: {
            statusRepository?: ServiceStatusRepository;
            messageRepository?: MessageRepository;
        }
    ) {
        this.statusRepository = deps?.statusRepository ?? new ServiceStatusRepository();
        this.messageRepository = deps?.messageRepository ?? new MessageRepository();
    }

    public async init(): Promise<void> {
        if (this.initialized && this.socket && this.connected) {
            logger.info('Baileys WhatsApp client already initialized and connected');
            return;
        }

        // Clean up any existing socket first
        if (this.socket) {
            try {
                this.socket.end(undefined);
            } catch (error) {
                logger.warn('Error ending existing socket during init:', error);
            }
            this.socket = null;
        }

        try {
            logger.info('Creating new Baileys WhatsApp client instance');
            logger.info('Session path:', config.whatsapp.sessionPath);

            // Ensure session directory exists before creating auth state
            const fs = require('fs');
            if (!fs.existsSync(config.whatsapp.sessionPath)) {
                fs.mkdirSync(config.whatsapp.sessionPath, { recursive: true });
                logger.info('Created session directory:', config.whatsapp.sessionPath);
            }

            // Use multi-file auth state for session management
            const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionPath);
            this.authState = state;

            logger.info('Auth state loaded, creds available:', !!state.creds);

            // Create the socket with minimal configuration
            this.socket = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                qrTimeout: 40000,
                logger: {
                    level: 'error',
                    child: () => ({
                        level: 'error',
                        trace: () => { },
                        debug: () => { },
                        info: () => { },
                        warn: () => { },
                        error: () => { },
                    } as any),
                    trace: () => { },
                    debug: () => { },
                    info: () => { },
                    warn: () => { },
                    error: (msg: any) => logger.error('Baileys:', msg),
                },
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 5,
                getMessage: async () => undefined,
                syncFullHistory: false,
                markOnlineOnConnect: false,
                browser: ['WhatsApp Web', 'Chrome', '4.0.0'],
                mobile: false,
                emitOwnEvents: true,
                fireInitQueries: true,
                generateHighQualityLinkPreview: false,
            });

            // Set up basic event handlers for QR and connection status
            this.setupBasicEventHandlers(saveCreds);

            this.initialized = true;
            logger.info('Baileys WhatsApp client initialized successfully');

            // Start polling for connection status
            this.startPolling();

        } catch (error) {
            logger.error('Failed to initialize Baileys WhatsApp client:', error);
            this.initialized = false;
            if (this.socket) {
                try {
                    this.socket.end(undefined);
                } catch (endError) {
                    logger.warn('Error ending socket after init failure:', endError);
                }
                this.socket = null;
            }
            await this.statusRepository.markAsDisconnected('whatsapp');
            throw error;
        }
    }

    private setupBasicEventHandlers(saveCreds: () => Promise<void>): void {
        if (!this.socket) return;

        // Handle QR code generation
        this.socket.ev.on('connection.update', async (update) => {
            const { qr } = update;
            if (qr) {
                try {
                    const qrString = await QRCode.toString(qr, { type: 'terminal' });
                    await this.statusRepository.setWhatsAppQRCode(qrString);
                    logger.info('WhatsApp QR code generated and stored');
                } catch (error) {
                    logger.error('Failed to generate QR code:', error);
                }
            }
        });

        // Handle credentials update
        this.socket.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                logger.debug('WhatsApp credentials updated');
            } catch (error) {
                logger.error('Error saving credentials:', error);
            }
        });
    }

    private startPolling(): void {
        // Stop any existing polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        // Poll every 10 seconds to check connection status
        this.pollingInterval = setInterval(async () => {
            if (!this.socket || !this.initialized) return;

            try {
                // Simple health check - try to send a test message to ourselves
                // If it succeeds, we're connected; if it fails, we're not
                const testJid = `${this.socket.user?.id?.split(':')[0]}@s.whatsapp.net`;

                if (testJid && testJid !== '@s.whatsapp.net') {
                    try {
                        // Try to get user info - if this fails, we're not connected
                        await this.socket.sendMessage(testJid, { text: 'test' });
                        if (!this.connected) {
                            logger.info('WhatsApp connection established via polling');
                            await this.statusRepository.clearWhatsAppQRCode();
                            await this.statusRepository.markAsConnected('whatsapp');
                            this.connected = true;
                        }
                    } catch (testError) {
                        if (this.connected) {
                            logger.info('WhatsApp connection lost via polling');
                            await this.statusRepository.markAsDisconnected('whatsapp');
                            this.connected = false;
                        }
                    }
                }
            } catch (error) {
                logger.debug('WhatsApp polling health check failed:', error);
                if (this.connected) {
                    await this.statusRepository.markAsDisconnected('whatsapp');
                    this.connected = false;
                }
            }
        }, 10000); // Poll every 10 seconds
    }

    private stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            logger.info('Starting Baileys WhatsApp disconnect process');

            // Stop polling first
            this.stopPolling();

            if (this.socket) {
                // Baileys logout
                await this.socket.logout();
                this.socket.end(undefined);
                this.socket = null;
                logger.info('Baileys WhatsApp logout completed successfully');
            }

            // Reset all state
            this.initialized = false;
            this.connected = false;
            this.authState = null;

            await this.statusRepository.markAsDisconnected('whatsapp');
            await this.statusRepository.clearWhatsAppQRCode();
            logger.info('Baileys WhatsApp provider disconnected successfully');
        } catch (error) {
            logger.error('Error during Baileys WhatsApp disconnect:', error);

            // Force reset state even on error
            this.initialized = false;
            this.connected = false;
            this.socket = null;
            this.authState = null;

            await this.statusRepository.markAsDisconnected('whatsapp');
            await this.statusRepository.clearWhatsAppQRCode();
        }
    }

    public isConnected(): boolean {
        return this.connected && this.socket !== null;
    }

    public async sendText(recipient: string, message: string, metadata?: Record<string, any>): Promise<SendResult> {
        // Input validation
        if (!recipient || typeof recipient !== 'string') {
            return { success: false, errorMessage: 'Recipient phone number is required' };
        }
        
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return { success: false, errorMessage: 'Message content is required' };
        }

        // Validate phone number using utility function
        const phoneValidation = validateWhatsAppPhoneNumber(recipient);
        if (!phoneValidation.isValid) {
            return { success: false, errorMessage: phoneValidation.error || 'Invalid phone number' };
        }

        try {
            // Store sanitized recipient in database
            const sanitizedRecipient = phoneValidation.formatted || phoneValidation.cleanNumber;
            const msg = await this.messageRepository.create({
                service: 'whatsapp' as ServiceType,
                recipient: sanitizedRecipient,
                message: message.trim(),
                status: 'pending',
                timestamp: new Date(),
                metadata: metadata ?? {},
                requestedBy: (metadata && (metadata as any).requestedBy) || (global as any).__requestedBy || 'admin',
            } as any);

            // Connection validation
            if (!this.connected || !this.socket) {
                await this.messageRepository.markAsFailed(msg.id, 'WhatsApp not connected. Please ensure WhatsApp is authenticated and connected.');
                return { success: false, errorMessage: 'WhatsApp not connected. Please authenticate first.' };
            }

            try {
                // Format JID for WhatsApp
                const jid = formatWhatsAppJID(phoneValidation.cleanNumber);

                // Validate message length (WhatsApp limit is around 65536 characters)
                if (message.length > 65000) {
                    throw new Error('Message too long. Maximum length is 65,000 characters.');
                }

                // Send message using Baileys with timeout
                logger.info(`Sending WhatsApp message to ${jid}`);
                const sendPromise = this.socket.sendMessage(jid, { 
                    text: message.trim() 
                });
                
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Message send timeout after 30 seconds')), 30000)
                );
                
                const sentMessage = await Promise.race([sendPromise, timeoutPromise]);

                if (sentMessage && sentMessage.key) {
                    await this.messageRepository.markAsSent(msg.id, sentMessage.key.id || 'unknown');
                    logger.info(`WhatsApp message sent successfully to ${sanitizedRecipient} with ID: ${sentMessage.key.id}`);
                    return { 
                        success: true, 
                        externalMessageId: sentMessage.key.id 
                    };
                } else {
                    throw new Error('Message sent but no response received from WhatsApp');
                }

            } catch (sendError) {
                let errorMessage = 'Failed to send WhatsApp message';
                
                if (sendError instanceof Error) {
                    errorMessage = sendError.message;
                    
                    // Handle specific WhatsApp errors
                    if (errorMessage.includes('not-authorized')) {
                        errorMessage = 'WhatsApp session expired. Please re-authenticate.';
                    } else if (errorMessage.includes('rate-overlimit')) {
                        errorMessage = 'Rate limit exceeded. Please try again later.';
                    } else if (errorMessage.includes('unavailable')) {
                        errorMessage = 'Recipient phone number is not available on WhatsApp.';
                    } else if (errorMessage.includes('timeout')) {
                        errorMessage = 'Message send timeout. Please check your connection and try again.';
                    }
                }

                logger.error('Baileys WhatsApp send error:', {
                    error: errorMessage,
                    originalError: sendError instanceof Error ? sendError.stack : sendError,
                    recipient: sanitizedRecipient,
                    connected: this.connected,
                    socketExists: !!this.socket
                });

                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            logger.error('Baileys WhatsApp send failed (database error):', { 
                error: errorMessage,
                recipient: phoneValidation.formatted || recipient
            });
            return { success: false, errorMessage: `Database error: ${errorMessage}` };
        }
    }

    public async sendMedia(recipient: string, mediaPath: string, caption?: string, metadata?: Record<string, any>): Promise<SendResult> {
        try {
            const msg = await this.messageRepository.create({
                service: 'whatsapp' as ServiceType,
                recipient,
                message: caption || 'Media message',
                status: 'pending',
                timestamp: new Date(),
                metadata: { ...metadata, mediaPath },
            } as any);

            if (!this.connected || !this.socket) {
                await this.messageRepository.markAsFailed(msg.id, 'WhatsApp not connected');
                return { success: false, errorMessage: 'WhatsApp not connected' };
            }

            try {
                // Validate and format phone number for WhatsApp
                const cleanNumber = recipient.replace(/\D/g, '');
                if (!cleanNumber || cleanNumber.length < 10) {
                    throw new Error('Invalid phone number format');
                }

                const jid = `${cleanNumber}@s.whatsapp.net`;

                // For now, just send as text with media path info
                // TODO: Implement proper media sending with Baileys
                const messageText = caption ? `${caption}\n[Media: ${mediaPath}]` : `[Media: ${mediaPath}]`;
                const sentMessage = await this.socket.sendMessage(jid, { text: messageText });

                await this.messageRepository.markAsSent(msg.id, sentMessage?.key?.id || 'unknown');
                return { success: true, externalMessageId: sentMessage?.key?.id };
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send media';
                logger.error('Baileys WhatsApp media send error:', {
                    error: errorMessage,
                    recipient,
                    mediaPath,
                    connected: this.connected,
                    socketExists: !!this.socket
                });
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Baileys WhatsApp media send failed', { error: errorMessage });
            return { success: false, errorMessage };
        }
    }

    public async reconnect(): Promise<void> {
        logger.info('Reconnecting Baileys WhatsApp client');
        await this.disconnect();
        await this.init();
    }

    public async forceReset(): Promise<void> {
        logger.info('Force resetting Baileys WhatsApp client state');
        await this.disconnect();
    }

    public async cleanRestart(): Promise<void> {
        logger.info('Performing clean restart of Baileys WhatsApp client');
        await this.forceReset();

        // Delete existing session files to force new QR generation
        try {
            const fs = require('fs');
            const sessionPath = config.whatsapp.sessionPath;
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                logger.info('Deleted existing session files for fresh start');
            }
        } catch (error) {
            logger.warn('Error deleting session files:', error);
        }

        await this.init();
    }

    public async forceNewSession(): Promise<void> {
        logger.info('Forcing new WhatsApp session');
        await this.cleanRestart();
    }

    public async connectSimulated(): Promise<void> {
        logger.warn('connectSimulated called on Baileys provider - using real connection');
        await this.init();
    }

    public stopReconnectionLoop(): void {
        logger.info('Manually stopping reconnection loop');
        this.stopPolling();
        this.initialized = false;
    }

    public resetReconnectionAttempts(): void {
        logger.info('Resetting reconnection attempts counter');
        // No-op for polling approach
    }

    public isInReconnectionLoop(): boolean {
        return false; // No reconnection loops in polling approach
    }

    public async startConnection(): Promise<void> {
        if (!this.socket) {
            logger.error('Cannot start connection: socket not initialized');
            return;
        }
        logger.info('Socket exists:', !!this.socket);
        logger.info('Current connection state:', this.connected);
    }

    public async waitForQRCode(timeoutMs: number = 10000): Promise<string | null> {
        logger.info('Waiting for QR code generation...', { timeoutMs });

        const startTime = Date.now();
        let attempts = 0;

        while (Date.now() - startTime < timeoutMs) {
            attempts++;
            const qrCode = await this.statusRepository.getWhatsAppQRCode();
            if (qrCode) {
                logger.info('QR code found after waiting', { attempts, waitTime: Date.now() - startTime });
                return qrCode;
            }

            logger.debug(`QR code check attempt ${attempts}, no QR found yet`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        logger.warn('QR code not generated within timeout', { attempts, timeoutMs });
        return null;
    }

    public async isInStreamErrorState(): Promise<boolean> {
        return !this.connected && this.initialized;
    }

    public async recoverFromStreamError(): Promise<void> {
        logger.info('Starting stream error recovery process');
        await this.forceReset();
        await this.init();
    }

    public getConnectionStatus(): {
        connected: boolean;
        initialized: boolean;
        socketExists: boolean;
        authStateExists: boolean;
    } {
        return {
            connected: this.connected,
            initialized: this.initialized,
            socketExists: !!this.socket,
            authStateExists: !!this.authState,
        };
    }

    public async handlePostScanConnection(): Promise<void> {
        logger.info('Handling post-scan connection gracefully');
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (this.connected && this.socket) {
            logger.info('Post-scan connection successful');
        } else {
            logger.warn('Post-scan connection not established properly');
        }
    }
}

export default BaileysWhatsAppProvider;
