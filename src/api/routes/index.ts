import { Router } from 'express';
import NotificationsController from '@/api/controllers/notificationsController';
import HealthController from '@/api/controllers/healthController';
import { createNotificationsRouter } from './notifications';
import { createHealthRouter } from './health';
import { requireFields } from '@/api/middleware/validation';

export function createApiRouter(
    notificationsController: NotificationsController,
    healthController: HealthController
) {
    const router = Router();

    router.use('/notifications', requireFields(['recipient', 'message']), createNotificationsRouter(notificationsController));
    router.use('/health', createHealthRouter(healthController));

    return router;
}

export default createApiRouter;


