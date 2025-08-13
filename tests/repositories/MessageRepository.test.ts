import mongoose from 'mongoose';
import { MessageRepository, MessageFilters } from '@/database/repositories/MessageRepository';
import { Message, IMessage } from '@/database/models/Message';
import { ServiceType, MessageStatus, PaginationOptions } from '@/types';

describe('MessageRepository', () => {
  let repository: MessageRepository;

  beforeEach(() => {
    repository = new MessageRepository();
  });

  const createTestMessage = async (overrides: Partial<IMessage> = {}): Promise<IMessage> => {
    const defaultData = {
      service: 'whatsapp' as ServiceType,
      recipient: '1234567890',
      message: 'Test message',
      status: 'pending' as MessageStatus,
      ...overrides,
    };
    return await repository.create(defaultData);
  };

  describe('findWithFilters', () => {
    beforeEach(async () => {
      await createTestMessage({ service: 'whatsapp', status: 'sent', recipient: '1111111111' });
      await createTestMessage({ service: 'telegram', status: 'pending', recipient: '2222222222' });
      await createTestMessage({ service: 'whatsapp', status: 'failed', recipient: '3333333333' });
    });

    it('should filter by service', async () => {
      const filters: MessageFilters = { service: 'whatsapp' };
      const paginationOptions: PaginationOptions = { page: 1, limit: 10 };

      const result = await repository.findWithFilters(filters, paginationOptions);

      expect(result.data).toHaveLength(2);
      expect(result.data.every(msg => msg.service === 'whatsapp')).toBe(true);
    });

    it('should filter by status', async () => {
      const filters: MessageFilters = { status: 'pending' };
      const paginationOptions: PaginationOptions = { page: 1, limit: 10 };

      const result = await repository.findWithFilters(filters, paginationOptions);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('pending');
    });

    it('should filter by recipient', async () => {
      const filters: MessageFilters = { recipient: '1111111111' };
      const paginationOptions: PaginationOptions = { page: 1, limit: 10 };

      const result = await repository.findWithFilters(filters, paginationOptions);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].recipient).toBe('1111111111');
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await createTestMessage({ timestamp: twoHoursAgo });

      const filters: MessageFilters = { 
        dateFrom: oneHourAgo,
        dateTo: now 
      };
      const paginationOptions: PaginationOptions = { page: 1, limit: 10 };

      const result = await repository.findWithFilters(filters, paginationOptions);

      expect(result.data).toHaveLength(3); // Original 3 messages are within range
    });

    it('should search in message content', async () => {
      await createTestMessage({ message: 'Special search term' });

      const filters: MessageFilters = { search: 'Special' };
      const paginationOptions: PaginationOptions = { page: 1, limit: 10 };

      const result = await repository.findWithFilters(filters, paginationOptions);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].message).toContain('Special');
    });
  });

  describe('findByService', () => {
    beforeEach(async () => {
      await createTestMessage({ service: 'whatsapp' });
      await createTestMessage({ service: 'whatsapp' });
      await createTestMessage({ service: 'telegram' });
    });

    it('should find messages by service without pagination', async () => {
      const result = await repository.findByService('whatsapp');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect((result as IMessage[]).every(msg => msg.service === 'whatsapp')).toBe(true);
    });

    it('should find messages by service with pagination', async () => {
      const paginationOptions: PaginationOptions = { page: 1, limit: 1 };
      const result = await repository.findByService('whatsapp', paginationOptions);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect((result as any).data).toHaveLength(1);
      expect((result as any).pagination.total).toBe(2);
    });
  });

  describe('findByStatus', () => {
    beforeEach(async () => {
      await createTestMessage({ status: 'pending' });
      await createTestMessage({ status: 'sent' });
      await createTestMessage({ status: 'pending' });
    });

    it('should find messages by status', async () => {
      const result = await repository.findByStatus('pending');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect((result as IMessage[]).every(msg => msg.status === 'pending')).toBe(true);
    });
  });

  describe('findByRecipient', () => {
    beforeEach(async () => {
      await createTestMessage({ recipient: '1111111111' });
      await createTestMessage({ recipient: '2222222222' });
      await createTestMessage({ recipient: '1111111111' });
    });

    it('should find messages by recipient', async () => {
      const result = await repository.findByRecipient('1111111111');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect((result as IMessage[]).every(msg => msg.recipient === '1111111111')).toBe(true);
    });
  });

  describe('findPendingMessages', () => {
    beforeEach(async () => {
      await createTestMessage({ status: 'pending', timestamp: new Date(Date.now() - 1000) });
      await createTestMessage({ status: 'sent' });
      await createTestMessage({ status: 'pending', timestamp: new Date(Date.now() - 2000) });
      await createTestMessage({ status: 'failed' });
    });

    it('should find pending messages ordered by timestamp', async () => {
      const result = await repository.findPendingMessages();

      expect(result).toHaveLength(2);
      expect(result.every(msg => msg.status === 'pending')).toBe(true);
      // Should be ordered by timestamp ascending (oldest first)
      expect(result[0].timestamp.getTime()).toBeLessThan(result[1].timestamp.getTime());
    });

    it('should respect limit parameter', async () => {
      const result = await repository.findPendingMessages(1);

      expect(result).toHaveLength(1);
    });
  });

  describe('findFailedMessagesForRetry', () => {
    beforeEach(async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      await createTestMessage({ status: 'failed', timestamp: oneHourAgo });
      await createTestMessage({ status: 'failed', timestamp: twoDaysAgo });
      await createTestMessage({ status: 'sent', timestamp: oneHourAgo });
    });

    it('should find failed messages within time range', async () => {
      const result = await repository.findFailedMessagesForRetry(24); // Last 24 hours

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('failed');
    });
  });

  describe('markAsSent', () => {
    it('should mark message as sent', async () => {
      const message = await createTestMessage({ status: 'pending' });
      const updated = await repository.markAsSent(message._id.toString(), 'external-123');

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('sent');
      expect(updated!.messageId).toBe('external-123');
      expect(updated!.errorMessage).toBeUndefined();
    });

    it('should mark message as sent without external message ID', async () => {
      const message = await createTestMessage({ status: 'pending' });
      const updated = await repository.markAsSent(message._id.toString());

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('sent');
      expect(updated!.messageId).toBeUndefined();
    });
  });

  describe('markAsFailed', () => {
    it('should mark message as failed with error message', async () => {
      const message = await createTestMessage({ status: 'pending' });
      const errorMessage = 'Network timeout error';
      const updated = await repository.markAsFailed(message._id.toString(), errorMessage);

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('failed');
      expect(updated!.errorMessage).toBe(errorMessage);
    });

    it('should truncate long error messages', async () => {
      const message = await createTestMessage({ status: 'pending' });
      const longError = 'x'.repeat(1500); // Longer than 1000 chars
      const updated = await repository.markAsFailed(message._id.toString(), longError);

      expect(updated).toBeDefined();
      expect(updated!.errorMessage!.length).toBe(1000);
    });
  });

  describe('getMessageStats', () => {
    beforeEach(async () => {
      await createTestMessage({ service: 'whatsapp', status: 'sent' });
      await createTestMessage({ service: 'whatsapp', status: 'sent' });
      await createTestMessage({ service: 'whatsapp', status: 'failed' });
      await createTestMessage({ service: 'telegram', status: 'sent' });
      await createTestMessage({ service: 'telegram', status: 'pending' });
    });

    it('should return message statistics grouped by service and status', async () => {
      const stats = await repository.getMessageStats();

      expect(stats).toHaveLength(2);
      
      const whatsappStats = stats.find(s => s.service === 'whatsapp');
      const telegramStats = stats.find(s => s.service === 'telegram');

      expect(whatsappStats).toBeDefined();
      expect(whatsappStats!.total).toBe(3);
      expect(whatsappStats!.stats).toHaveLength(2); // sent and failed

      expect(telegramStats).toBeDefined();
      expect(telegramStats!.total).toBe(2);
      expect(telegramStats!.stats).toHaveLength(2); // sent and pending
    });
  });

  describe('getMessageStatsForPeriod', () => {
    it('should return statistics for specific time period', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      await createTestMessage({ service: 'whatsapp', status: 'sent', timestamp: oneHourAgo });
      await createTestMessage({ service: 'whatsapp', status: 'sent', timestamp: twoDaysAgo });

      const stats = await repository.getMessageStatsForPeriod(oneHourAgo, now);

      expect(stats).toHaveLength(1);
      expect(stats[0].service).toBe('whatsapp');
      expect(stats[0].total).toBe(1);
    });
  });

  describe('deleteOldMessages', () => {
    it('should delete messages older than retention period', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const recentDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      await createTestMessage({ timestamp: oldDate });
      await createTestMessage({ timestamp: recentDate });

      const deletedCount = await repository.deleteOldMessages(90); // 90 days retention

      expect(deletedCount).toBe(1);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(1);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple messages at once', async () => {
      const messages = [
        { service: 'whatsapp' as ServiceType, recipient: '1111111111', message: 'Message 1' },
        { service: 'telegram' as ServiceType, recipient: '2222222222', message: 'Message 2' },
      ];

      const result = await repository.bulkCreate(messages);

      expect(result).toHaveLength(2);
      expect(result[0].service).toBe('whatsapp');
      expect(result[1].service).toBe('telegram');
    });
  });

  describe('getRecentActivity', () => {
    beforeEach(async () => {
      // Create messages with different timestamps
      for (let i = 0; i < 5; i++) {
        await createTestMessage({ 
          message: `Message ${i}`,
          timestamp: new Date(Date.now() - i * 1000) 
        });
      }
    });

    it('should return recent messages ordered by timestamp', async () => {
      const result = await repository.getRecentActivity(3);

      expect(result).toHaveLength(3);
      expect(result[0].message).toBe('Message 0'); // Most recent
      expect(result[1].message).toBe('Message 1');
      expect(result[2].message).toBe('Message 2');
    });
  });
});