import { EventEmitter } from 'events';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
import { MessageRepository } from '@/database/repositories/MessageRepository';
import { ServiceType } from '@/types';
import { config } from '@/config/environment';
import logger from '@/utils/logger';

export interface SendResult {
    success: boolean;
    externalMessageId?: string;
    errorMessage?: string;
}

export interface WhatsAppProviderEvents {
    on(event: 'qr', listener: (qr: string) => void): this;
    on(event: 'ready', listener: () => void): this;
    on(event: 'authenticated', listener: () => void): this;
    on(event: 'disconnected', listener: (reason?: string) => void): this;
}

export class WhatsAppProvider extends (EventEmitter as { new(): EventEmitter & WhatsAppProviderEvents }) {
    private statusRepository: ServiceStatusRepository;
    private messageRepository: MessageRepository;
    private client: Client | null = null;
    private initialized = false;
    private connected = false;

    constructor(
        deps?: {
            statusRepository?: ServiceStatusRepository;
            messageRepository?: MessageRepository;
        }
    ) {
        super();
        this.statusRepository = deps?.statusRepository ?? new ServiceStatusRepository();
        this.messageRepository = deps?.messageRepository ?? new MessageRepository();
    }

    public async init(): Promise<void> {
        if (this.initialized && this.client) {
            logger.info('WhatsApp client already initialized');
            return;
        }

        // Clean up any existing client first
        if (this.client) {
            try {
                await this.client.destroy();
            } catch (error) {
                logger.warn('Error destroying existing client during init:', error);
            }
            this.client = null;
        }

        this.initialized = true;

        try {
            logger.info('Creating new WhatsApp client instance');
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: config.whatsapp.sessionPath,
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox', 
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu'
                    ],
                },
            });

            this.setupEventHandlers();
            
            logger.info('Initializing WhatsApp client...');
            await this.client.initialize();
            logger.info('WhatsApp client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize WhatsApp client:', error);
            
            // Clean up on failure
            this.initialized = false;
            if (this.client) {
                try {
                    await this.client.destroy();
                } catch (destroyError) {
                    logger.warn('Error destroying client after init failure:', destroyError);
                }
                this.client = null;
            }
            
            await this.statusRepository.markAsDisconnected('whatsapp');
            throw error;
        }
    }

    private setupEventHandlers(): void {
        if (!this.client) return;

        this.client.on('qr', async (qr) => {
            try {
                // Store the raw QR string for the React component
                await this.statusRepository.setWhatsAppQRCode(qr);
                this.emit('qr', qr);
                logger.info('WhatsApp QR code generated', { length: qr.length });
            } catch (error) {
                logger.error('Failed to generate QR code:', error);
            }
        });

        this.client.on('ready', async () => {
            try {
                await this.statusRepository.clearWhatsAppQRCode();
                await this.statusRepository.markAsConnected('whatsapp');
                this.connected = true;
                this.emit('ready');
                logger.info('WhatsApp client ready');

                // Verify client is actually ready by testing basic functionality
                const info = await this.client!.getState();
                logger.info(`WhatsApp client state: ${info}`);
            } catch (error) {
                logger.error('Error in WhatsApp ready handler:', error);
                this.connected = false;
                await this.statusRepository.markAsDisconnected('whatsapp');
            }
        });

        this.client.on('authenticated', async () => {
            await this.statusRepository.markAsConnected('whatsapp');
            this.connected = true;
            this.emit('authenticated');
            logger.info('WhatsApp client authenticated');
        });

        this.client.on('disconnected', async (reason) => {
            await this.statusRepository.markAsDisconnected('whatsapp');
            this.connected = false;
            this.emit('disconnected', reason);
            logger.warn('WhatsApp client disconnected:', reason);
        });

        this.client.on('auth_failure', async (message) => {
            await this.statusRepository.markAsDisconnected('whatsapp');
            this.connected = false;
            logger.error('WhatsApp authentication failed:', message);
        });
    }

    public async connectSimulated(): Promise<void> {
        // Keep this method for backward compatibility in testing
        if (this.client) {
            logger.warn('Real WhatsApp client is initialized, use init() instead');
            return;
        }
        await this.statusRepository.clearWhatsAppQRCode();
        await this.statusRepository.markAsConnected('whatsapp');
        this.connected = true;
        this.emit('authenticated');
        this.emit('ready');
        logger.info('WhatsApp provider connected (simulated)');
    }

    public async reconnect(): Promise<void> {
        logger.info('Reconnecting WhatsApp client');

        // First disconnect if already connected
        if (this.client) {
            await this.disconnect();
        }

        // Reset state
        this.initialized = false;
        this.connected = false;

        // Reinitialize
        await this.init();
    }

    public async forceReset(): Promise<void> {
        logger.info('Force resetting WhatsApp client state');

        // Force cleanup without proper logout (for emergency cases)
        if (this.client) {
            try {
                await this.client.destroy();
            } catch (error) {
                logger.warn('Error destroying client during force reset:', error);
            }
        }

        this.client = null;
        this.initialized = false;
        this.connected = false;

        await this.statusRepository.markAsDisconnected('whatsapp');
        await this.statusRepository.clearWhatsAppQRCode();
        this.emit('disconnected');

        logger.info('WhatsApp client state force reset completed');
    }

    public async cleanRestart(): Promise<void> {
        logger.info('Performing clean restart of WhatsApp client');
        
        // Force reset first
        await this.forceReset();
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Then initialize fresh
        await this.init();
        
        logger.info('WhatsApp client clean restart completed');
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.client) {
                logger.info('Starting WhatsApp disconnect process');

                // First, properly logout from WhatsApp Web (this also calls authStrategy.logout())
                try {
                    await this.client.logout();
                    logger.info('WhatsApp logout completed successfully');
                } catch (logoutError) {
                    logger.error('WhatsApp logout failed:', logoutError);

                    // If logout fails, try to destroy the client anyway
                    try {
                        await this.client.destroy();
                        logger.info('WhatsApp client destroyed after logout failure');
                    } catch (destroyError) {
                        logger.error('WhatsApp client destroy also failed:', destroyError);
                    }
                }

                this.client = null;
            }

            // Reset all state
            this.initialized = false;
            this.connected = false;

            await this.statusRepository.markAsDisconnected('whatsapp');
            this.emit('disconnected');
            logger.info('WhatsApp provider disconnected successfully');
        } catch (error) {
            logger.error('Error during WhatsApp disconnect:', error);
            
            // Force reset state even on error
            this.initialized = false;
            this.connected = false;
            this.client = null;
            
            await this.statusRepository.markAsDisconnected('whatsapp');
            this.emit('disconnected');
        }
    }

    public isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    private async ensureClientReady(): Promise<boolean> {
        if (!this.client || !this.connected) {
            logger.warn('WhatsApp client not ready, attempting to reconnect');
            return false;
        }

        try {
            // Test if client is responsive by getting client info
            const info = await this.client.getState();
            if (info !== 'CONNECTED') {
                logger.warn(`WhatsApp client state is ${info}, not CONNECTED`);
                return false;
            }
            return true;
        } catch (error) {
            logger.error('WhatsApp client health check failed:', error);
            return false;
        }
    }

    private async sendMessageWithRetry(chatId: string, content: any, options?: any, maxRetries: number = 2): Promise<any> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    logger.info(`WhatsApp send retry attempt ${attempt} for ${chatId}`);
                    // Wait a bit before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }

                // Check if chat exists first
                try {
                    await this.client!.getChatById(chatId);
                } catch (chatError) {
                    // Chat doesn't exist, that's okay - WhatsApp will create it
                    logger.info(`Chat ${chatId} doesn't exist yet, will be created on send`);
                }

                // Send the message
                if (options) {
                    return await this.client!.sendMessage(chatId, content, options);
                } else {
                    return await this.client!.sendMessage(chatId, content);
                }
            } catch (error) {
                lastError = error as Error;
                logger.warn(`WhatsApp send attempt ${attempt + 1} failed:`, error);

                // If it's a getChat error, try to continue anyway
                if (error instanceof Error && error.message.includes('getChat')) {
                    logger.info('Ignoring getChat error and attempting direct send');
                    try {
                        if (options) {
                            return await this.client!.sendMessage(chatId, content, options);
                        } else {
                            return await this.client!.sendMessage(chatId, content);
                        }
                    } catch (directSendError) {
                        lastError = directSendError as Error;
                    }
                }
            }
        }

        throw lastError || new Error('Failed to send message after retries');
    }

    public async sendText(recipient: string, message: string, metadata?: Record<string, any>): Promise<SendResult> {
        try {
            const msg = await this.messageRepository.create({
                service: 'whatsapp' as ServiceType,
                recipient,
                message,
                status: 'pending',
                timestamp: new Date(),
                metadata: metadata ?? {},
            } as any);

            if (!this.connected || !this.client) {
                await this.messageRepository.markAsFailed(msg.id, 'WhatsApp not connected');
                return { success: false, errorMessage: 'WhatsApp not connected' };
            }

            // Ensure client is ready before sending
            const clientReady = await this.ensureClientReady();
            if (!clientReady) {
                await this.messageRepository.markAsFailed(msg.id, 'WhatsApp client not ready');
                return { success: false, errorMessage: 'WhatsApp client not ready' };
            }

            try {
                // Validate and format phone number for WhatsApp
                const cleanNumber = recipient.replace(/\D/g, '');
                if (!cleanNumber || cleanNumber.length < 10) {
                    throw new Error('Invalid phone number format');
                }

                const chatId = `${cleanNumber}@c.us`;

                // Check if client is still connected before sending
                if (!this.client || !this.connected) {
                    throw new Error('WhatsApp client disconnected');
                }

                // Send message with retry logic
                const sentMessage = await this.sendMessageWithRetry(chatId, message);

                await this.messageRepository.markAsSent(msg.id, sentMessage.id.id);
                return { success: true, externalMessageId: sentMessage.id.id };
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send message';
                logger.error('WhatsApp send error details:', {
                    error: errorMessage,
                    recipient,
                    connected: this.connected,
                    clientExists: !!this.client
                });
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('WhatsApp send failed', { error: errorMessage });
            return { success: false, errorMessage };
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

            if (!this.connected || !this.client) {
                await this.messageRepository.markAsFailed(msg.id, 'WhatsApp not connected');
                return { success: false, errorMessage: 'WhatsApp not connected' };
            }

            // Ensure client is ready before sending
            const clientReady = await this.ensureClientReady();
            if (!clientReady) {
                await this.messageRepository.markAsFailed(msg.id, 'WhatsApp client not ready');
                return { success: false, errorMessage: 'WhatsApp client not ready' };
            }

            try {
                // Validate and format phone number for WhatsApp
                const cleanNumber = recipient.replace(/\D/g, '');
                if (!cleanNumber || cleanNumber.length < 10) {
                    throw new Error('Invalid phone number format');
                }

                const chatId = `${cleanNumber}@c.us`;

                // Check if client is still connected before sending
                if (!this.client || !this.connected) {
                    throw new Error('WhatsApp client disconnected');
                }

                const media = MessageMedia.fromFilePath(mediaPath);
                const options = caption ? { caption } : {};
                const sentMessage = await this.sendMessageWithRetry(chatId, media, options);

                await this.messageRepository.markAsSent(msg.id, sentMessage.id.id);
                return { success: true, externalMessageId: sentMessage.id.id };
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send media';
                logger.error('WhatsApp media send error details:', {
                    error: errorMessage,
                    recipient,
                    mediaPath,
                    connected: this.connected,
                    clientExists: !!this.client
                });
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('WhatsApp media send failed', { error: errorMessage });
            return { success: false, errorMessage };
        }
    }
}

export default WhatsAppProvider;


