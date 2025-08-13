import { Router } from 'express';
import NotificationsController from '@/api/controllers/notificationsController';
import { validateBody } from '@/api/middleware/validation';
import { apiKeyOrAdminAuth } from '@/api/middleware/notificationsAuth';
import { whatsappNotificationSchema, telegramNotificationSchema } from '@/api/validation/schemas';

export function createNotificationsRouter(controller: NotificationsController) {
    const router = Router();

    // WhatsApp notifications require whatsapp:send permission
    router.post('/whatsapp',
        apiKeyOrAdminAuth('whatsapp:send'),
        validateBody(whatsappNotificationSchema),
        controller.sendWhatsApp
    );

    // Telegram notifications require telegram:send permission
    router.post('/telegram',
        apiKeyOrAdminAuth('telegram:send'),
        validateBody(telegramNotificationSchema),
        controller.sendTelegram
    );

    return router;
}

export default createNotificationsRouter;


