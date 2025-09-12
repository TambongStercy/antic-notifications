import { Router } from 'express';
import NotificationsController from '@/api/controllers/notificationsController';
import { validateBody } from '@/api/middleware/validation';
import { apiKeyOrAdminAuth } from '@/api/middleware/notificationsAuth';
import { whatsappNotificationSchema, telegramNotificationSchema, mattermostNotificationSchema } from '@/api/validation/schemas';

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

    // Mattermost notifications require mattermost:send permission
    router.post('/mattermost',
        apiKeyOrAdminAuth('mattermost:send'),
        // Debug middleware to check form data parsing
        (req, res, next) => {
            console.log('Content-Type:', req.headers['content-type']);
            console.log('Request body:', req.body);
            console.log('Body keys:', Object.keys(req.body));
            next();
        },
        validateBody(mattermostNotificationSchema),
        controller.sendMattermost
    );

    return router;
}

export default createNotificationsRouter;


