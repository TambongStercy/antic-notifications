import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import httpLogger from '@/api/middleware/logging';
import apiRateLimiter from '@/api/middleware/rateLimit';
import errorHandler from '@/api/middleware/errorHandler';
import { config } from '@/config/environment';
import NotificationService from '@/services/NotificationService';
import NotificationsController from '@/api/controllers/notificationsController';
import HealthController from '@/api/controllers/healthController';
import { createNotificationsRouter } from '@/api/routes/notifications';
import { createHealthRouter } from '@/api/routes/health';
import { createAdminRouter } from '@/api/routes/admin';
import { createMessagesRouter } from '@/api/routes/messages';
import { createApiKeyRouter } from '@/api/routes/apiKeys';
import AdminController from '@/api/controllers/adminController';
import MessagesController from '@/api/controllers/messagesController';
import ApiKeyController from '@/api/controllers/apiKeyController';

export function buildApp(service: NotificationService) {
    const app = express();

    app.use(helmet());
    app.use(cors({ origin: config.cors.origin, credentials: config.cors.credentials }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true })); // Support form-data
    app.use(httpLogger);
    app.use(apiRateLimiter);

    const notificationsController = new NotificationsController(service);
    const healthController = new HealthController(service);
    const adminController = new AdminController(service);
    const messagesController = new MessagesController();
    const apiKeyController = new ApiKeyController();

    app.use('/api/notifications', createNotificationsRouter(notificationsController));
    app.use('/api/health', createHealthRouter(healthController));
    app.use('/api/admin', createAdminRouter(adminController));
    app.use('/api/messages', createMessagesRouter(messagesController));
    app.use('/api/admin/api-keys', createApiKeyRouter(apiKeyController));

    app.use(errorHandler);

    return app;
}

export default buildApp;


