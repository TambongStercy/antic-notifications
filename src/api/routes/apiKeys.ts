import { Router } from 'express';
import ApiKeyController from '@/api/controllers/apiKeyController';
import { validateBody } from '@/api/middleware/validation';
import { authMiddleware } from '@/api/middleware/auth';
import {
    createApiKeySchema,
    updateApiKeySchema
} from '@/api/validation/schemas';

export function createApiKeyRouter(controller: ApiKeyController) {
    const router = Router();

    // All API key management routes require admin authentication
    router.use(authMiddleware);

    router.post('/', validateBody(createApiKeySchema), controller.createApiKey);
    router.get('/', controller.getApiKeys);
    router.get('/stats', controller.getUsageStats);
    router.get('/usage-series', controller.getApiKeyUsageSeries);
    router.get('/:id', controller.getApiKey);
    router.put('/:id', validateBody(updateApiKeySchema), controller.updateApiKey);
    router.delete('/:id', controller.deleteApiKey);

    return router;
}

export default createApiKeyRouter;