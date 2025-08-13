import { MessageRepository } from '@/database/repositories/MessageRepository';
import { ServiceType } from '@/types';
import logger from '@/utils/logger';

export interface QueuedMessage {
    id: string;
    service: ServiceType;
    recipient: string;
    message: string;
    metadata?: Record<string, any>;
    retryCount: number;
    maxRetries: number;
    nextRetryAt: Date;
}

export class MessageQueueService {
    private messageRepository: MessageRepository;
    private processingInterval?: NodeJS.Timeout;
    private isProcessing = false;

    constructor(deps?: { messageRepository?: MessageRepository }) {
        this.messageRepository = deps?.messageRepository ?? new MessageRepository();
    }

    public start(intervalMs: number = 30000): void {
        if (this.processingInterval) {
            return;
        }

        this.processingInterval = setInterval(() => {
            this.processRetryQueue().catch(error => {
                logger.error('Error processing retry queue:', error);
            });
        }, intervalMs);

        logger.info('Message queue service started');
    }

    public stop(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = undefined;
            logger.info('Message queue service stopped');
        }
    }

    public async processRetryQueue(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            // Get failed messages that are ready for retry
            const failedMessages = await this.messageRepository.findFailedMessagesForRetry(24, 50);

            if (failedMessages.length === 0) {
                return;
            }

            logger.info(`Processing ${failedMessages.length} failed messages for retry`);

            for (const message of failedMessages) {
                await this.retryMessage(message);
            }
        } catch (error) {
            logger.error('Error in retry queue processing:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async retryMessage(message: any): Promise<void> {
        try {
            // Check retry count from metadata
            const retryCount = (message.metadata?.retryCount ?? 0) + 1;
            const maxRetries = message.metadata?.maxRetries ?? 3;

            if (retryCount > maxRetries) {
                logger.warn(`Message ${message.id} exceeded max retries (${maxRetries})`);
                return;
            }

            // Update retry metadata
            await this.messageRepository.updateById(message.id, {
                status: 'pending',
                metadata: {
                    ...message.metadata,
                    retryCount,
                    lastRetryAt: new Date(),
                },
                $unset: { errorMessage: 1 },
            });

            logger.info(`Queued message ${message.id} for retry (attempt ${retryCount}/${maxRetries})`);
        } catch (error) {
            logger.error(`Failed to retry message ${message.id}:`, error);
        }
    }

    public async addToRetryQueue(messageId: string, errorMessage: string, retryDelayMs: number = 300000): Promise<void> {
        try {
            const nextRetryAt = new Date(Date.now() + retryDelayMs);

            await this.messageRepository.updateById(messageId, {
                status: 'failed',
                errorMessage,
                metadata: {
                    nextRetryAt: nextRetryAt.toISOString(),
                },
            });

            logger.info(`Added message ${messageId} to retry queue, next retry at ${nextRetryAt.toISOString()}`);
        } catch (error) {
            logger.error(`Failed to add message ${messageId} to retry queue:`, error);
        }
    }

    public async getQueueStats(): Promise<{
        pendingMessages: number;
        failedMessages: number;
        retryableMessages: number;
    }> {
        try {
            const [pendingMessages, failedMessages, retryableMessages] = await Promise.all([
                this.messageRepository.count({ status: 'pending' }),
                this.messageRepository.count({ status: 'failed' }),
                this.messageRepository.findFailedMessagesForRetry(24, 1000).then(msgs => msgs.length),
            ]);

            return {
                pendingMessages,
                failedMessages,
                retryableMessages,
            };
        } catch (error) {
            logger.error('Failed to get queue stats:', error);
            return {
                pendingMessages: 0,
                failedMessages: 0,
                retryableMessages: 0,
            };
        }
    }
}

export default MessageQueueService;
