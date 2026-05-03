import makeWASocket, {
    useMultiFileAuthState,
    WASocket,
    AuthenticationState,
    DisconnectReason
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import P from 'pino';
import fs from 'fs';
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
    private lastRestartTime = 0;
    private restartCooldownMs = 60000; // 1 minute cooldown between restarts

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
            // Check if WhatsApp is marked as disconnected in database
            const status = await this.statusRepository.findByService('whatsapp');

            // Only delete session files if there are existing credentials but we're disconnected
            // This prevents deleting fresh credentials after QR scan during restart
            const hasExistingSession = fs.existsSync(config.whatsapp.sessionPath) &&
                                      fs.readdirSync(config.whatsapp.sessionPath).length > 0;

            if (status && status.status === 'disconnected' && hasExistingSession) {
                // Check if session files have credentials (creds.json exists)
                const credsPath = `${config.whatsapp.sessionPath}/creds.json`;
                const hasCredentials = fs.existsSync(credsPath);

                // Only clear if NOT recently modified (older than 30 seconds)
                // This prevents deleting fresh credentials from QR scan
                if (hasCredentials) {
                    const stats = fs.statSync(credsPath);
                    const ageMs = Date.now() - stats.mtimeMs;

                    if (ageMs > 30000) { // Older than 30 seconds
                        logger.info('WhatsApp is disconnected with old session, clearing session files');
                        fs.rmSync(config.whatsapp.sessionPath, { recursive: true, force: true });
                        logger.info('Deleted old session files for fresh start');
                    } else {
                        logger.info('Session files are fresh (likely from recent QR scan), preserving them');
                    }
                }
            }

            logger.info('Creating new Baileys WhatsApp client instance');
            logger.info('Session path:', config.whatsapp.sessionPath);

            // Ensure session directory exists before creating auth state
            if (!fs.existsSync(config.whatsapp.sessionPath)) {
                fs.mkdirSync(config.whatsapp.sessionPath, { recursive: true });
                logger.info('Created session directory:', config.whatsapp.sessionPath);
            }

            // Use multi-file auth state for session management
            const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionPath);
            this.authState = state;

            logger.info('Auth state loaded, creds available:', !!state.creds);

            // Define WhatsApp version to prevent protocol mismatch (fixes 405 error)
            const WHATSAPP_VERSION: [number, number, number] = [2, 3000, 1027934701];

            // Create the socket with extended timeouts for slow connections
            // Increased from 60s to 180s to accommodate slow internet (1.63 Mbps)
            this.socket = makeWASocket({
                auth: state,
                version: WHATSAPP_VERSION,
                browser: ['Ubuntu', 'Chrome', '22.04.4'],
                printQRInTerminal: false,
                connectTimeoutMs: 180000, // 3 minutes (was 60s)
                defaultQueryTimeoutMs: 180000, // 3 minutes (was 60s)
                keepAliveIntervalMs: 30000, // Send keepalive every 30s
                retryRequestDelayMs: 5000, // 5s delay between retries (was default 2s)
                qrTimeout: 120000, // 2 minutes for QR code generation
                markOnlineOnConnect: false, // Reduce initial connection overhead
            });

            // Set up basic event handlers for QR and connection status
            this.setupBasicEventHandlers(saveCreds);

            this.initialized = true;
            logger.info('Baileys WhatsApp client initialized successfully');

            // Polling disabled - using proper event handlers instead
            // this.startPolling();

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

        // Handle connection updates including QR code and connection status
        this.socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin, isOnline, receivedPendingNotifications } = update;

            logger.info('WhatsApp connection update:', {
                connection,
                hasQR: !!qr,
                isNewLogin,
                isOnline,
                receivedPendingNotifications,
                lastDisconnect: lastDisconnect ? {
                    statusCode: (lastDisconnect.error as Boom)?.output?.statusCode,
                    reason: this.getDisconnectReasonName((lastDisconnect.error as Boom)?.output?.statusCode)
                } : null
            });

            // Handle QR code generation
            if (qr) {
                try {
                    const qrString = await QRCode.toDataURL(qr);
                    await this.statusRepository.setWhatsAppQRCode(qrString);
                    logger.info('WhatsApp QR code generated and stored');
                } catch (error) {
                    logger.error('Failed to generate QR code:', error);
                }
            }

            // Handle connection status changes
            if (connection === 'open') {
                logger.info('WhatsApp connection established successfully');
                this.connected = true;
                await this.statusRepository.markAsConnected('whatsapp');
                await this.statusRepository.clearWhatsAppQRCode();
            } else if (connection === 'close') {
                this.connected = false;
                await this.statusRepository.markAsDisconnected('whatsapp');

                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                // Don't reconnect for logged out, forbidden, or method not allowed errors
                const permanentErrors = [DisconnectReason.loggedOut, 403, 405];
                const shouldReconnect = !permanentErrors.includes(statusCode || 0);

                logger.info(`WhatsApp connection closed due to ${this.getDisconnectReasonName(statusCode)}, reconnecting: ${shouldReconnect}`);

                // Handle different disconnect reasons according to Baileys best practices
                if (shouldReconnect) {
                    // Special handling for restart required during QR scanning
                    if (statusCode === DisconnectReason.restartRequired) {
                        logger.info('Restart required - likely after QR scan, reconnecting immediately');
                        // Reconnect immediately for restart required errors during auth
                        // DO NOT delete session files - they contain the authenticated credentials
                        setTimeout(() => {
                            if (!this.connected) {
                                logger.info('Attempting immediate reconnection after restart required');
                                this.softReconnect().catch(err =>
                                    logger.error('Auto-reconnect failed:', err)
                                );
                            }
                        }, 2000); // Just 2 seconds delay
                    } else {
                        // Implement exponential backoff for other errors
                        const delay = this.getReconnectDelay(statusCode);
                        logger.info(`Scheduling reconnection in ${delay / 1000} seconds`);

                        setTimeout(() => {
                            if (!this.connected) {
                                logger.info('Attempting automatic reconnection');
                                this.reconnect().catch(err =>
                                    logger.error('Auto-reconnect failed:', err)
                                );
                            }
                        }, delay);
                    }
                } else {
                    logger.warn('Not reconnecting due to logout or permanent error');
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
                try {
                    // Only logout if connection is active (prevents 428 error on already closed connections)
                    if (this.connected) {
                        await this.socket.logout();
                        logger.info('Baileys WhatsApp logout completed successfully');
                    } else {
                        logger.info('Socket already closed, skipping logout');
                    }
                } catch (logoutError) {
                    // Ignore logout errors for already closed connections
                    const error = logoutError as Boom;
                    if (error?.output?.statusCode === 428) {
                        logger.info('Socket already closed, logout not needed');
                    } else {
                        logger.warn('Logout error (continuing with cleanup):', logoutError);
                    }
                }

                // Always end the socket and clean up
                try {
                    this.socket.end(undefined);
                } catch (endError) {
                    logger.warn('Error ending socket (continuing with cleanup):', endError);
                }
                this.socket = null;
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

                // Add timeout to prevent hanging (increased for slow connection)
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Message send timeout after 90 seconds')), 90000)
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

    public async softReconnect(): Promise<void> {
        logger.info('Soft reconnecting Baileys WhatsApp client (preserving session)');

        // Stop polling
        this.stopPolling();

        // Clean up socket without logout (preserve credentials)
        if (this.socket) {
            try {
                this.socket.end(undefined);
            } catch (error) {
                logger.warn('Error ending socket during soft reconnect:', error);
            }
            this.socket = null;
        }

        // Reset connection state but keep initialized flag
        this.connected = false;

        // Reinitialize with existing session files
        await this.init();
    }

    public async forceReset(): Promise<void> {
        logger.info('Force resetting Baileys WhatsApp client state');
        await this.disconnect();
    }

    public async cleanRestart(): Promise<void> {
        const now = Date.now();

        // Prevent excessive restarts
        if (now - this.lastRestartTime < this.restartCooldownMs) {
            const remainingCooldown = this.restartCooldownMs - (now - this.lastRestartTime);
            logger.warn(`Clean restart blocked by cooldown. ${Math.ceil(remainingCooldown / 1000)}s remaining`);
            return;
        }

        this.lastRestartTime = now;
        logger.info('Performing clean restart of Baileys WhatsApp client');
        await this.forceReset();

        // Delete existing session files to force new QR generation
        try {
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

    private getDisconnectReasonName(statusCode?: number): string {
        if (!statusCode) return 'Unknown';

        const reasons: Record<number, string> = {
            401: 'Logged Out',
            403: 'Forbidden',
            405: 'Method Not Allowed (WhatsApp Protocol Changed)',
            408: 'Timed Out / Connection Lost',
            411: 'Multidevice Mismatch',
            428: 'Connection Closed',
            440: 'Connection Replaced',
            500: 'Bad Session',
            503: 'Unavailable Service',
            515: 'Restart Required'
        };

        return reasons[statusCode] || `Unknown (${statusCode})`;
    }

    private getReconnectDelay(statusCode?: number): number {
        if (!statusCode) return 60000; // 60 seconds default (was 30s)

        // Implement exponential backoff based on error type
        // All delays doubled to accommodate slow internet connection
        switch (statusCode) {
            case DisconnectReason.restartRequired: // 515 - restart required, wait longer
                return 300000; // 5 minutes
            case DisconnectReason.connectionLost:
            case DisconnectReason.connectionClosed:
                return 20000; // 20 seconds (was 10s)
            case DisconnectReason.timedOut: // 408 - most common on slow connections
                return 60000; // 60 seconds (was 30s) - give more time before retry
            case DisconnectReason.badSession:
                return 120000; // 2 minutes (was 1 minute)
            case DisconnectReason.unavailableService:
                return 180000; // 3 minutes (was 2 minutes)
            default:
                return 60000; // 60 seconds default (was 30s)
        }
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
