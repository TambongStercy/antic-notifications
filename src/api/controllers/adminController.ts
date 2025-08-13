import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminUserRepository } from '@/database/repositories/AdminUserRepository';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
import NotificationService from '@/services/NotificationService';
import { config } from '@/config/environment';

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
            await telegram.connect();
            return res.json({ success: true, message: 'Telegram connection initiated' });
        } catch (err) { return next(err); }
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
            await telegram.disconnect();
            return res.json({ success: true, message: 'Telegram bot disconnected' });
        } catch (err) { return next(err); }
    };

    connectWhatsApp = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();

            // Use cleanRestart method which handles stuck browser instances
            await whatsapp.cleanRestart();

            // Wait a bit for QR code to be generated
            await new Promise(resolve => setTimeout(resolve, 2000));

            return res.json({ success: true, message: 'WhatsApp connection initiated' });
        } catch (err) { return next(err); }
    };

    disconnectWhatsApp = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();
            await whatsapp.disconnect();
            return res.json({ success: true, message: 'WhatsApp disconnected' });
        } catch (err) { return next(err); }
    };

    forceResetWhatsApp = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();
            await whatsapp.forceReset();
            return res.json({ success: true, message: 'WhatsApp force reset completed' });
        } catch (err) { return next(err); }
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
            // First try to get existing QR code
            let qrCode = await this.statusRepo.getWhatsAppQRCode();

            // If no QR code, wait a bit for it to be generated
            if (!qrCode) {
                const { whatsapp } = this.service.getProviders();
                qrCode = await whatsapp.waitForQRCode(5000); // Wait up to 5 seconds
            }

            if (!qrCode) {
                return res.status(404).json({
                    error: { code: 'qr_not_found', message: 'No QR code available. WhatsApp may be connected or not initialized.' },
                    timestamp: new Date().toISOString(),
                    path: _req.originalUrl,
                });
            }
            return res.json({ qrCode });
        } catch (err) { return next(err); }
    };

    getWhatsAppRealTimeStatus = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const { whatsapp } = this.service.getProviders();

            const realTimeStatus = {
                isConnected: whatsapp.isConnected(),
                isInReconnectionLoop: whatsapp.isInReconnectionLoop(),
                dbStatus: await this.statusRepo.findByService('whatsapp'),
                timestamp: new Date().toISOString()
            };

            return res.json(realTimeStatus);
        } catch (err) { return next(err); }
    };
}

export default AdminController;


