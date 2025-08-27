import { Router } from 'express';
import AdminController from '@/api/controllers/adminController';
import { validateBody } from '@/api/middleware/validation';
import { authMiddleware } from '@/api/middleware/auth';
import { adminLoginSchema, telegramTokenSchema } from '@/api/validation/schemas';
import { adminRateLimiter } from '@/api/middleware/rateLimit';

export function createAdminRouter(controller: AdminController) {
    const router = Router();
    
    // Apply admin rate limiter to all admin routes
    router.use(adminRateLimiter);
    
    router.post('/login', validateBody(adminLoginSchema), controller.login);
    router.get('/status', authMiddleware, controller.status);
    router.post('/telegram/credentials', authMiddleware, controller.setTelegramCredentials);
    router.post('/telegram/connect', authMiddleware, controller.connectTelegram);
    router.post('/telegram/disconnect', authMiddleware, controller.disconnectTelegram);
    router.post('/telegram/provide-code', authMiddleware, controller.provideTelegramCode);
    router.post('/telegram/provide-password', authMiddleware, controller.provideTelegramPassword);
    router.post('/whatsapp/connect', authMiddleware, controller.connectWhatsApp);
    router.post('/whatsapp/disconnect', authMiddleware, controller.disconnectWhatsApp);
    router.post('/whatsapp/force-reset', authMiddleware, controller.forceResetWhatsApp);
    router.post('/whatsapp/new-session', authMiddleware, controller.forceNewSessionWhatsApp);
    router.post('/whatsapp/handle-stream-error', authMiddleware, controller.handleStreamErrorWhatsApp);
    router.post('/whatsapp/stop-reconnection', authMiddleware, controller.stopWhatsAppReconnectionLoop);
    router.post('/whatsapp/reset-reconnection-attempts', authMiddleware, controller.resetWhatsAppReconnectionAttempts);
    router.post('/whatsapp/handle-post-scan', authMiddleware, controller.handlePostScanConnection);
    router.get('/whatsapp/realtime-status', authMiddleware, controller.getWhatsAppRealTimeStatus);
    router.get('/whatsapp/simple-status', authMiddleware, controller.getWhatsAppSimpleStatus);
    router.get('/telegram/simple-status', authMiddleware, controller.getTelegramSimpleStatus);
    router.post('/mattermost/config', authMiddleware, controller.setMattermostConfig);
    router.post('/mattermost/connect', authMiddleware, controller.connectMattermost);
    router.post('/mattermost/disconnect', authMiddleware, controller.disconnectMattermost);
    router.get('/mattermost/status', authMiddleware, controller.getMattermostStatus);
    router.delete('/mattermost/config', authMiddleware, controller.clearMattermostConfig);
    router.get('/qr', authMiddleware, controller.getWhatsAppQR);
    return router;
}

export default createAdminRouter;