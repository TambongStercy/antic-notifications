import { Router } from 'express';
import MessagesController from '@/api/controllers/messagesController';
import { validateQuery, validateParams } from '@/api/middleware/validation';
import { authMiddleware } from '@/api/middleware/auth';
import { messageFiltersSchema } from '@/api/validation/schemas';
import Joi from 'joi';

const messageIdSchema = Joi.object({
    id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/).messages({
        'string.pattern.base': 'Invalid message ID format'
    }),
});

export function createMessagesRouter(controller: MessagesController) {
    const router = Router();

    router.get('/', authMiddleware, validateQuery(messageFiltersSchema), controller.getMessages);
    router.get('/stats', authMiddleware, controller.getMessageStats);
    router.get('/:id', authMiddleware, validateParams(messageIdSchema), controller.getMessageById);
    router.post('/:id/retry', authMiddleware, validateParams(messageIdSchema), controller.retryMessage);

    return router;
}

export default createMessagesRouter;
