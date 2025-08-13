import { EventEmitter } from 'events';
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    ConnectionState,
    AuthenticationState,
    SignalDataTypeMap
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
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

export interface BaileysWhatsAppProviderEvents {
    on(event: 'qr', listener: (qr: string) => void): this;
    on(event: 'ready', listener: () => void): this;
    on(event: 'authenticated', listener: () => void): this;
    on(event: 'disconnected', listener: (reason?: string) => void): this;
    on(event: 'stream-error', listener: (reason: string) => void): this;
    on(event: 'connecting', listener: () => void): this;
    on(event: 'reconnection-loop', listener: (attempts: number) => void): this;
}

export class BaileysWhatsAppProvider extends (EventEmitter as { new(): EventEmitter & BaileysWhatsAppProviderEvents }) {
    private statusRepository: ServiceStatusRepository;
    private messageRepository: MessageRepository;
    private socket: WASocket | null = null;
    private initialized = false;
    private connected = false;
    private authState: AuthenticationState | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private lastDisconnectTime = 0;

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
        if (this.initialized && this.socket && this.connected) {
            logger.info('Baileys WhatsApp client already initialized and connected');
            return;
        }

        // If initialized but not connected, allow re-initialization
        if (this.initialized && this.socket && !this.connected) {
            logger.info('Baileys WhatsApp client initialized but not connected, reinitializing...');
            this.initialized = false;
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

        this.initialized = true;

        try {
            logger.info('Creating new Baileys WhatsApp client instance');
            logger.info('Session path:', config.whatsapp.sessionPath);

            // Use multi-file auth state for session management
            const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionPath);
            this.authState = state;

            logger.info('Auth state loaded, creds available:', !!state.creds);

            // Create the socket with better configuration
            this.socket = makeWASocket({
                auth: state,
                printQRInTerminal: false, // We'll handle QR ourselves
                connectTimeoutMs: 60000, // 60 seconds timeout
                defaultQueryTimeoutMs: 60000, // 60 seconds query timeout
                keepAliveIntervalMs: 10000, // 10 seconds keep alive
                logger: {
                    level: 'error', // Reduce Baileys logging
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
                // Add retry configuration
                retryRequestDelayMs: 250,
                maxMsgRetryCount: 5,
            });

            this.setupEventHandlers(saveCreds);

            // Force connection start if not already connected
            if (!this.connected) {
                logger.info('Starting Baileys WhatsApp connection...');
                // The socket should automatically start connecting, but let's ensure it
                setTimeout(() => {
                    if (!this.connected && this.socket) {
                        logger.info('Connection not established yet, socket exists:', !!this.socket);
                    }
                }, 5000);
            }

            logger.info('Baileys WhatsApp client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Baileys WhatsApp client:', error);

            // Clean up on failure
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

    private setupEventHandlers(saveCreds: () => Promise<void>): void {
        if (!this.socket) return;

        // Handle connection updates
        this.socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            logger.info('Baileys connection update', {
                connection,
                hasQR: !!qr,
                hasLastDisconnect: !!lastDisconnect
            });

            // Emit connection state changes
            if (connection === 'connecting') {
                logger.info('WhatsApp is connecting...');
                this.emit('connecting');
            } else if (connection === 'open') {
                logger.info('WhatsApp connection opened');
            }

            if (qr) {
                try {
                    // Generate QR code and store it
                    const qrString = await QRCode.toString(qr, { type: 'terminal' });
                    await this.statusRepository.setWhatsAppQRCode(qr);
                    this.emit('qr', qr);
                    logger.info('WhatsApp QR code generated and stored', {
                        length: qr.length,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    logger.error('Failed to generate QR code:', error);
                }
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                logger.info('WhatsApp connection closed', {
                    shouldReconnect,
                    statusCode,
                    reason: lastDisconnect?.error?.message
                });

                this.connected = false;
                await this.statusRepository.markAsDisconnected('whatsapp');
                this.emit('disconnected', lastDisconnect?.error?.message);

                // Handle specific error codes
                if (statusCode === 515) {
                    logger.warn('WhatsApp stream error 515 - clearing session and forcing fresh start');

                    // Emit specific stream error event
                    this.emit('stream-error', 'Stream Errored (restart required)');

                    // Clear session files for fresh start
                    try {
                        const fs = require('fs');
                        const sessionPath = config.whatsapp.sessionPath;
                        if (fs.existsSync(sessionPath)) {
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                            logger.info('Cleared session files due to stream error');
                        }
                    } catch (error) {
                        logger.warn('Error clearing session files:', error);
                    }

                    // For stream errors, don't auto-reconnect - wait for manual intervention
                    this.initialized = false;
                    return;
                }

                // Handle other common error codes
                if (statusCode === 401) {
                    logger.warn('WhatsApp authentication failed - clearing session');
                    try {
                        const fs = require('fs');
                        const sessionPath = config.whatsapp.sessionPath;
                        if (fs.existsSync(sessionPath)) {
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                            logger.info('Cleared session files due to auth failure');
                        }
                    } catch (error) {
                        logger.warn('Error clearing session files:', error);
                    }
                    // Don't auto-reconnect on auth failures
                    this.initialized = false;
                    return;
                }

                // Check for rapid disconnections (within 30 seconds)
                const now = Date.now();
                const timeSinceLastDisconnect = now - this.lastDisconnectTime;
                this.lastDisconnectTime = now;

                if (timeSinceLastDisconnect < 30000) { // Less than 30 seconds
                    this.reconnectAttempts++;
                    logger.warn('Rapid disconnection detected', {
                        attempts: this.reconnectAttempts,
                        timeSinceLastDisconnect,
                        statusCode
                    });
                } else {
                    // Reset counter if enough time has passed
                    this.reconnectAttempts = 0;
                }

                // Stop reconnecting if too many rapid attempts
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    logger.error('Too many rapid reconnection attempts - stopping auto-reconnect', {
                        attempts: this.reconnectAttempts,
                        maxAttempts: this.maxReconnectAttempts
                    });
                    this.initialized = false;
                    this.emit('reconnection-loop', this.reconnectAttempts);
                    this.reconnectAttempts = 0;
                    return;
                }

                if (shouldReconnect) {
                    const delay = Math.min(5000 * (this.reconnectAttempts + 1), 30000); // Exponential backoff, max 30s
                    logger.info('Attempting to reconnect WhatsApp...', {
                        statusCode,
                        attempt: this.reconnectAttempts + 1,
                        delay
                    });

                    // Reset initialization flag for fresh start
                    this.initialized = false;
                    setTimeout(() => this.init(), delay);
                }
            } else if (connection === 'open') {
                logger.info('WhatsApp connection opened');
                await this.statusRepository.clearWhatsAppQRCode();
                logger.info('WhatsApp QR code cleared after successful connection');
                await this.statusRepository.markAsConnected('whatsapp');
                this.connected = true;

                // Reset reconnect attempts on successful connection
                this.reconnectAttempts = 0;

                this.emit('authenticated');
                this.emit('ready');
            }
        });

        // Handle credentials update
        this.socket.ev.on('creds.update', saveCreds);

        // Handle messages (for future use)
        this.socket.ev.on('messages.upsert', (m) => {
            // Handle incoming messages if needed
            logger.debug('Received messages:', m.messages.length);
        });
    }

    public async disconnect(): Promise<void> {
        try {
            logger.info('Starting Baileys WhatsApp disconnect process');

            if (this.socket) {
                // Baileys logout - this will trigger loggedOut disconnect reason
                await this.socket.logout();
                this.socket.end(undefined);
                this.socket = null;
                logger.info('Baileys WhatsApp logout completed successfully');
            }

            // Reset all state
            this.initialized = false;
            this.connected = false;
            this.authState = null;
            this.reconnectAttempts = 0;

            await this.statusRepository.markAsDisconnected('whatsapp');
            await this.statusRepository.clearWhatsAppQRCode();
            this.emit('disconnected');
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
            this.emit('disconnected');
        }
    }

    public isConnected(): boolean {
        return this.connected && this.socket !== null;
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
                requestedBy: (metadata && (metadata as any).requestedBy) || (global as any).__requestedBy || 'admin',
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

                // Send message using Baileys
                const sentMessage = await this.socket.sendMessage(jid, { text: message });

                await this.messageRepository.markAsSent(msg.id, sentMessage?.key?.id || 'unknown');
                return { success: true, externalMessageId: sentMessage?.key?.id };
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send message';
                logger.error('Baileys WhatsApp send error:', {
                    error: errorMessage,
                    recipient,
                    connected: this.connected,
                    socketExists: !!this.socket
                });
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Baileys WhatsApp send failed', { error: errorMessage });
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

        // First disconnect if already connected
        if (this.socket) {
            await this.disconnect();
        }

        // Reset state
        this.initialized = false;
        this.connected = false;

        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reinitialize
        await this.init();
    }

    public async forceReset(): Promise<void> {
        logger.info('Force resetting Baileys WhatsApp client state');

        // Force cleanup
        if (this.socket) {
            try {
                this.socket.end(undefined);
            } catch (error) {
                logger.warn('Error ending socket during force reset:', error);
            }
        }

        this.socket = null;
        this.initialized = false;
        this.connected = false;
        this.authState = null;
        this.reconnectAttempts = 0;

        await this.statusRepository.markAsDisconnected('whatsapp');
        await this.statusRepository.clearWhatsAppQRCode();
        this.emit('disconnected');

        logger.info('Baileys WhatsApp client state force reset completed');
    }

    public async cleanRestart(): Promise<void> {
        logger.info('Performing clean restart of Baileys WhatsApp client');

        // Clear any existing QR code first
        await this.statusRepository.clearWhatsAppQRCode();

        // Force reset first
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

        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Then initialize fresh
        await this.init();

        logger.info('Baileys WhatsApp client clean restart completed');
    }

    public async forceNewSession(): Promise<void> {
        logger.info('Forcing new WhatsApp session (deleting existing auth state)');

        // First disconnect
        await this.forceReset();

        // Delete existing session files to force new QR generation
        try {
            const fs = require('fs');
            const path = require('path');
            const sessionPath = config.whatsapp.sessionPath;

            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                logger.info('Deleted existing session files');
            }
        } catch (error) {
            logger.warn('Error deleting session files:', error);
        }

        // Wait and reinitialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.init();

        logger.info('New session initialization completed');
    }

    // Keep for backward compatibility
    public async connectSimulated(): Promise<void> {
        logger.warn('connectSimulated called on Baileys provider - using real connection');
        await this.init();
    }

    // Method to stop reconnection loops manually
    public stopReconnectionLoop(): void {
        logger.info('Manually stopping reconnection loop');
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.initialized = false;
    }

    // Check if we're in a reconnection loop
    public isInReconnectionLoop(): boolean {
        return this.reconnectAttempts >= this.maxReconnectAttempts;
    }

    // Manual method to trigger connection (for debugging)
    public async startConnection(): Promise<void> {
        if (!this.socket) {
            logger.error('Cannot start connection: socket not initialized');
            return;
        }

        logger.info('Manually triggering Baileys connection...');
        // In Baileys, the connection starts automatically when the socket is created
        // But we can check the state and log it
        logger.info('Socket exists:', !!this.socket);
        logger.info('Current connection state:', this.connected);
    }

    // Wait for QR code to be generated (with timeout)
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

            // Wait 500ms before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        logger.warn('QR code not generated within timeout', { attempts, timeoutMs });
        return null;
    }

    // Check if we're in a stream error state and need recovery
    public async isInStreamErrorState(): Promise<boolean> {
        // Check if we're supposed to be connected but aren't
        if (!this.connected && this.initialized) {
            // Check if there's no QR code available (indicating a stuck state)
            const qrCode = await this.statusRepository.getWhatsAppQRCode();
            if (!qrCode) {
                logger.info('Detected potential stream error state: initialized but not connected and no QR code');
                return true;
            }
        }
        return false;
    }

    // Enhanced recovery method specifically for stream errors
    public async recoverFromStreamError(): Promise<void> {
        logger.info('Starting stream error recovery process');

        // Force complete cleanup
        if (this.socket) {
            try {
                this.socket.end(undefined);
            } catch (error) {
                logger.warn('Error ending socket during stream recovery:', error);
            }
        }

        this.socket = null;
        this.initialized = false;
        this.connected = false;
        this.authState = null;

        // Clear status and QR code
        await this.statusRepository.markAsDisconnected('whatsapp');
        await this.statusRepository.clearWhatsAppQRCode();

        // Clear session files to force fresh authentication
        try {
            const fs = require('fs');
            const sessionPath = config.whatsapp.sessionPath;

            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                logger.info('Cleared session files for stream error recovery');
            }
        } catch (error) {
            logger.warn('Error clearing session files during stream recovery:', error);
        }

        // Wait longer for complete cleanup
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Reinitialize with fresh state
        await this.init();

        logger.info('Stream error recovery completed');
    }
}

export default BaileysWhatsAppProvider;