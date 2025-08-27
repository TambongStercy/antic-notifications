import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminUserRepository } from '@/database/repositories/AdminUserRepository';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
import NotificationService from '@/services/NotificationService';
import { config } from '@/config/environment';
import logger from '@/utils/logger';

export class AdminController {
    private adminRepo = new AdminUserRepository();
    private statusRepo = new ServiceStatusRepository();

    constructor(private service: NotificationService) { }

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;
            const user = await this.adminRepo.authenticate(username, password);
            if (!user) {
                return res.status(401).json({
                    error: { code: 'invalid_credentials', message: 'Invalid username or password' },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                });
            }
            const payload = { userId: user.id, username: user.username, role: user.role };
            const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
            const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
            return res.json({ accessToken, refreshToken });
        } catch (err) { return next(err); }
    };

    status = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const statuses = await this.statusRepo.getAllStatuses();
            return res.json(statuses);
        } catch (err) { return next(err); }
    };

    setTelegramCredentials = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { phoneNumber } = req.body;
            const { telegram } = this.service.getProviders();
            await telegram.configureCredentials({ apiId: undefined as any, apiHash: undefined as any, phoneNumber });
            return res.json({ success: true, message: 'Telegram phone number saved. App credentials taken from env.' });
        } catch (err) { return next(err); }
    };

    connectTelegram = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { telegram } = this.service.getProviders();
            
            if (!telegram.isConfigured()) {
                return res.status(400).json({
                    success: false,
                    message: 'Telegram credentials not configured. Please set up credentials first.',
                    error: 'not_configured'
                });
            }

            if (telegram.isConnected()) {
                return res.json({
                    success: true,
                    message: 'Telegram is already connected',
                    status: 'connected'
                });
            }

            if (telegram.isAuthInProgress()) {
                return res.json({
                    success: true,
                    message: 'Telegram authentication is already in progress',
                    status: 'auth_in_progress'
                });
            }

            await telegram.connect();
            return res.json({ 
                success: true, 
                message: 'Telegram connection initiated. Check for authentication prompts.',
                status: 'connecting'
            });
        } catch (err) {
            logger.error('Telegram connection error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to connect to Telegram. Please check your credentials and try again.',
                error: 'connection_failed'
            });
        }
    };

    provideTelegramCode = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { code } = req.body;
            const { telegram } = this.service.getProviders();
            telegram.providePhoneCode(code);
            return res.json({ success: true, message: 'Phone code provided' });
        } catch (err) { return next(err); }
    };

    provideTelegramPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { password } = req.body;
            const { telegram } = this.service.getProviders();
            telegram.providePassword(password);
            return res.json({ success: true, message: 'Password provided' });
        } catch (err) { return next(err); }
    };

    disconnectTelegram = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { telegram } = this.service.getProviders();
            
            if (!telegram.isConnected()) {
                return res.json({
                    success: true,
                    message: 'Telegram is already disconnected',
                    status: 'already_disconnected'
                });
            }

            await telegram.disconnect();
            return res.json({ 
                success: true, 
                message: 'Telegram has been disconnected successfully',
                status: 'disconnected'
            });
        } catch (err) {
            logger.error('Telegram disconnect error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to disconnect Telegram properly. Connection may still be active.',
                error: 'disconnect_failed'
            });
        }
    };

    connectWhatsApp = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();

            // Check if already connected
            if (whatsapp.isConnected()) {
                return res.json({
                    success: true,
                    message: 'WhatsApp is already connected',
                    status: 'connected'
                });
            }

            // Use cleanRestart method which handles stuck browser instances
            await whatsapp.cleanRestart();

            // Wait a bit for QR code to be generated
            await new Promise(resolve => setTimeout(resolve, 3000));

            return res.json({
                success: true,
                message: 'WhatsApp connection initiated. Please scan the QR code.',
                status: 'connecting'
            });
        } catch (err) {
            logger.error('WhatsApp connection error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to start WhatsApp connection. Please try again.',
                error: 'connection_failed'
            });
        }
    };

    disconnectWhatsApp = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();

            if (!whatsapp.isConnected()) {
                return res.json({
                    success: true,
                    message: 'WhatsApp is already disconnected',
                    status: 'already_disconnected'
                });
            }

            await whatsapp.disconnect();
            return res.json({
                success: true,
                message: 'WhatsApp has been disconnected successfully',
                status: 'disconnected'
            });
        } catch (err) {
            logger.error('WhatsApp disconnect error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to disconnect WhatsApp properly. Connection may still be active.',
                error: 'disconnect_failed'
            });
        }
    };

    forceResetWhatsApp = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();
            await whatsapp.forceReset();

            // Wait a moment for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            return res.json({
                success: true,
                message: 'WhatsApp has been reset. You can now try connecting again.',
                status: 'reset_complete'
            });
        } catch (err) {
            logger.error('WhatsApp force reset error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to reset WhatsApp. Please restart the application.',
                error: 'reset_failed'
            });
        }
    };

    forceNewSessionWhatsApp = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();
            await whatsapp.forceNewSession();
            return res.json({ success: true, message: 'WhatsApp new session initiated' });
        } catch (err) { return next(err); }
    };

    handleStreamErrorWhatsApp = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();

            // Use the enhanced recovery method
            await whatsapp.recoverFromStreamError();

            return res.json({ success: true, message: 'WhatsApp stream error recovery completed' });
        } catch (err) { return next(err); }
    };

    stopWhatsAppReconnectionLoop = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();

            // Stop the reconnection loop
            whatsapp.stopReconnectionLoop();

            return res.json({ success: true, message: 'WhatsApp reconnection loop stopped' });
        } catch (err) { return next(err); }
    };

    getWhatsAppQR = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();

            // Check if already connected
            if (whatsapp.isConnected()) {
                return res.json({
                    success: false,
                    message: 'WhatsApp is already connected',
                    status: 'connected'
                });
            }

            // First try to get existing QR code
            let qrCode = await this.statusRepo.getWhatsAppQRCode();

            // If no QR code, wait a bit for it to be generated
            if (!qrCode) {
                qrCode = await whatsapp.waitForQRCode(8000); // Wait up to 8 seconds
            }

            if (!qrCode) {
                return res.json({
                    success: false,
                    message: 'QR code not ready yet. Please try connecting first.',
                    status: 'no_qr'
                });
            }

            return res.json({
                success: true,
                qrCode,
                message: 'QR code ready for scanning',
                status: 'qr_ready'
            });
        } catch (err) {
            logger.error('Get QR code error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to get QR code. Please try connecting again.',
                error: 'qr_fetch_failed'
            });
        }
    };

    getWhatsAppRealTimeStatus = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();
            const dbStatus = await this.statusRepo.findByService('whatsapp');
            const connectionStatus = whatsapp.getConnectionStatus();

            // Simplified status for frontend
            let status = 'disconnected';
            let message = 'WhatsApp is not connected';

            if (whatsapp.isConnected()) {
                status = 'connected';
                message = 'WhatsApp is connected and ready';
            } else if (connectionStatus.initialized && !connectionStatus.connected) {
                const qrCode = await this.statusRepo.getWhatsAppQRCode();
                if (qrCode) {
                    status = 'waiting_for_scan';
                    message = 'QR code is ready for scanning';
                } else {
                    status = 'connecting';
                    message = 'WhatsApp is connecting...';
                }
            } else if (whatsapp.isInReconnectionLoop()) {
                status = 'reconnection_loop';
                message = 'Connection issues detected. Please try force reset.';
            }

            const realTimeStatus = {
                success: true,
                status,
                message,
                isConnected: whatsapp.isConnected(),
                hasQRCode: !!(await this.statusRepo.getWhatsAppQRCode()),
                needsReset: whatsapp.isInReconnectionLoop(),
                timestamp: new Date().toISOString(),
                // Include detailed info for debugging (optional)
                debug: {
                    connectionStatus,
                    dbStatus: dbStatus?.status || 'unknown'
                }
            };

            return res.json(realTimeStatus);
        } catch (err) {
            logger.error('Get WhatsApp status error:', err);
            return res.json({
                success: false,
                status: 'error',
                message: 'Failed to get WhatsApp status',
                isConnected: false,
                hasQRCode: false,
                needsReset: true,
                timestamp: new Date().toISOString()
            });
        }
    };

    resetWhatsAppReconnectionAttempts = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();
            whatsapp.resetReconnectionAttempts();
            return res.json({ success: true, message: 'WhatsApp reconnection attempts reset' });
        } catch (err) { return next(err); }
    };

    handlePostScanConnection = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();
            await whatsapp.handlePostScanConnection();
            return res.json({
                success: true,
                message: 'Connection stabilized successfully',
                status: 'connected'
            });
        } catch (err) {
            logger.error('Post-scan connection error:', err);
            return res.status(500).json({
                success: false,
                message: 'Connection may be unstable. Please check status.',
                error: 'post_scan_failed'
            });
        }
    };

    // Simple status check for frontend polling
    getWhatsAppSimpleStatus = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();
            const hasQRCode = !!(await this.statusRepo.getWhatsAppQRCode());

            return res.json({
                connected: whatsapp.isConnected(),
                hasQRCode,
                needsReset: whatsapp.isInReconnectionLoop(),
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            return res.json({
                connected: false,
                hasQRCode: false,
                needsReset: true,
                timestamp: new Date().toISOString()
            });
        }
    };

    // Simple Telegram status check
    getTelegramSimpleStatus = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { telegram } = this.service.getProviders();
            const status = telegram.getConnectionStatus();
            
            return res.json({
                configured: status.configured,
                connected: status.connected,
                authInProgress: status.authInProgress,
                canAutoConnect: status.canAutoConnect,
                needsSetup: !status.configured,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            return res.json({
                configured: false,
                connected: false,
                authInProgress: false,
                canAutoConnect: false,
                needsSetup: true,
                timestamp: new Date().toISOString()
            });
        }
    };

    // Mattermost methods
    setMattermostConfig = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serverUrl, accessToken } = req.body;
            
            if (!serverUrl || !accessToken) {
                return res.status(400).json({
                    error: { 
                        code: 'missing_credentials',
                        message: 'Server URL and access token are required'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                });
            }

            await this.statusRepo.setMattermostConfig(serverUrl.trim(), accessToken.trim());
            
            return res.json({ 
                success: true, 
                message: 'Mattermost configuration saved successfully'
            });
        } catch (err) {
            logger.error('Error setting Mattermost configuration:', err);
            return next(err);
        }
    };

    connectMattermost = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { mattermost } = this.service.getProviders();
            
            if (await this.statusRepo.isServiceConnected('mattermost')) {
                return res.json({
                    success: true,
                    message: 'Mattermost is already connected',
                    status: 'connected'
                });
            }

            const config = await this.statusRepo.getMattermostConfig();
            if (!config?.serverUrl || !config?.accessToken) {
                return res.status(400).json({
                    error: {
                        code: 'not_configured',
                        message: 'Mattermost server URL and access token must be configured first'
                    },
                    timestamp: new Date().toISOString(),
                    path: _req.originalUrl,
                });
            }

            await mattermost.initialize({
                serverUrl: config.serverUrl,
                accessToken: config.accessToken
            });
            
            const connected = await mattermost.connect();
            
            if (connected) {
                await this.statusRepo.markAsConnected('mattermost');
                return res.json({
                    success: true,
                    message: 'Mattermost connected successfully',
                    status: 'connected'
                });
            } else {
                return res.status(400).json({
                    error: {
                        code: 'connection_failed',
                        message: 'Failed to connect to Mattermost. Please check your server URL and access token.'
                    },
                    timestamp: new Date().toISOString(),
                    path: _req.originalUrl,
                });
            }
        } catch (err) {
            logger.error('Mattermost connection error:', err);
            return res.status(500).json({
                error: {
                    code: 'internal_error',
                    message: 'Failed to connect to Mattermost. Please check your credentials and try again.'
                },
                timestamp: new Date().toISOString(),
                path: _req.originalUrl,
            });
        }
    };

    disconnectMattermost = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { mattermost } = this.service.getProviders();
            
            if (!(await this.statusRepo.isServiceConnected('mattermost'))) {
                return res.json({
                    success: true,
                    message: 'Mattermost is already disconnected',
                    status: 'already_disconnected'
                });
            }

            await mattermost.disconnect();
            await this.statusRepo.markAsDisconnected('mattermost');
            
            return res.json({
                success: true,
                message: 'Mattermost has been disconnected successfully',
                status: 'disconnected'
            });
        } catch (err) {
            logger.error('Mattermost disconnect error:', err);
            return res.status(500).json({
                error: {
                    code: 'internal_error',
                    message: 'Failed to disconnect Mattermost properly. Connection may still be active.'
                },
                timestamp: new Date().toISOString(),
                path: _req.originalUrl,
            });
        }
    };

    getMattermostStatus = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const status = await this.statusRepo.findByService('mattermost');
            const config = await this.statusRepo.getMattermostConfig();
            
            if (status && config?.serverUrl && config?.accessToken) {
                const isConnected = await this.statusRepo.isServiceConnected('mattermost');
                
                return res.json({
                    configured: true,
                    connected: isConnected,
                    serverUrl: config.serverUrl,
                    hasAccessToken: !!config.accessToken,
                    lastUpdated: status.lastUpdated,
                    timestamp: new Date().toISOString()
                });
            }
            
            return res.json({
                configured: false,
                connected: false,
                serverUrl: null,
                hasAccessToken: false,
                needsSetup: true,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            logger.error('Error getting Mattermost status:', err);
            return next(err);
        }
    };

    clearMattermostConfig = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { mattermost } = this.service.getProviders();
            
            if (await this.statusRepo.isServiceConnected('mattermost')) {
                await mattermost.disconnect();
            }
            
            await this.statusRepo.clearMattermostConfig();
            
            return res.json({
                success: true,
                message: 'Mattermost configuration cleared successfully'
            });
        } catch (err) {
            logger.error('Error clearing Mattermost configuration:', err);
            return next(err);
        }
    };
}

export default AdminController;
