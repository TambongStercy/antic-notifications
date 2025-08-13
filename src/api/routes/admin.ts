import { Router } from 'express';
import AdminController from '@/api/controllers/adminController';
import { validateBody } from '@/api/middleware/validation';
import { authMiddleware } from '@/api/middleware/auth';
import { adminLoginSchema, telegramTokenSchema } from '@/api/validation/schemas';

export function createAdminRouter(controller: AdminController) {
    const router = Router();
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
    router.get('/whatsapp/realtime-status', authMiddleware, controller.getWhatsAppRealTimeStatus);
    router.get('/qr', authMiddleware, controller.getWhatsAppQR);
    return router;
}

export default createAdminRouter;


