import { Request, Response, NextFunction } from 'express';
import { MessageRepository } from '@/database/repositories/MessageRepository';
import MessageQueueService from '@/services/MessageQueueService';

export class MessagesController {
    private messageRepo = new MessageRepository();
    private queueService = new MessageQueueService();

    getMessages = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const filters = req.query as any;
            const pagination = {
                page: parseInt(filters.page as string) || 1,
                limit: parseInt(filters.limit as string) || 20,
                sortBy: filters.sortBy || 'timestamp',
                sortOrder: filters.sortOrder || 'desc',
            };

            const result = await this.messageRepo.findWithFilters(filters, pagination);
            res.json(result);
        } catch (err) { next(err); }
    };

    getMessageById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const message = await this.messageRepo.findById(id);

            if (!message) {
                return res.status(404).json({
                    error: { code: 'message_not_found', message: 'Message not found' },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                });
            }

            res.json(message);
        } catch (err) { next(err); }
    };

    getMessageStats = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const [stats, queueStats] = await Promise.all([
                this.messageRepo.getMessageStats(),
                this.queueService.getQueueStats(),
            ]);

            res.json({
                messageStats: stats,
                queueStats,
            });
        } catch (err) { next(err); }
    };

    retryMessage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const message = await this.messageRepo.findById(id);

            if (!message) {
                return res.status(404).json({
                    error: { code: 'message_not_found', message: 'Message not found' },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                });
            }

            if (message.status !== 'failed') {
                return res.status(400).json({
                    error: { code: 'invalid_status', message: 'Can only retry failed messages' },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                });
            }

            // Reset message to pending status for retry
            await this.messageRepo.updateById(id, {
                status: 'pending',
                $unset: { errorMessage: 1 },
                metadata: {
                    ...message.metadata,
                    manualRetry: true,
                    retryRequestedAt: new Date().toISOString(),
                },
            });

            res.json({ success: true, message: 'Message queued for retry' });
        } catch (err) { next(err); }
    };
}

export default MessagesController;
