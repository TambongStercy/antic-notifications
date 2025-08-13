import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { Message, IMessage } from '@/database/models/Message';
import { ServiceType, MessageStatus, PaginationOptions, PaginatedResponse } from '@/types';
import logger from '@/utils/logger';

export interface MessageFilters {
  service?: ServiceType;
  status?: MessageStatus;
  recipient?: string;
  requestedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface MessageStats {
  service: ServiceType;
  stats: Array<{
    status: MessageStatus;
    count: number;
  }>;
  total: number;
}

export class MessageRepository extends BaseRepository<IMessage> {
  constructor() {
    super(Message);
  }

  /**
   * Find messages with advanced filtering and pagination
   */
  async findWithFilters(
    filters: MessageFilters,
    paginationOptions: PaginationOptions
  ): Promise<PaginatedResponse<IMessage>> {
    try {
      const query = this.buildFilterQuery(filters);
      return await this.findWithPagination(query, paginationOptions);
    } catch (error) {
      logger.error('Error finding messages with filters:', error);
      throw error;
    }
  }

  /**
   * Find messages by service
   */
  async findByService(
    service: ServiceType,
    paginationOptions?: PaginationOptions
  ): Promise<PaginatedResponse<IMessage> | IMessage[]> {
    try {
      const filter = { service };

      if (paginationOptions) {
        return await this.findWithPagination(filter, paginationOptions);
      }

      return await this.find(filter, { sort: { timestamp: -1 } });
    } catch (error) {
      logger.error(`Error finding messages by service ${service}:`, error);
      throw error;
    }
  }

  /**
   * Find messages by status
   */
  async findByStatus(
    status: MessageStatus,
    paginationOptions?: PaginationOptions
  ): Promise<PaginatedResponse<IMessage> | IMessage[]> {
    try {
      const filter = { status };

      if (paginationOptions) {
        return await this.findWithPagination(filter, paginationOptions);
      }

      return await this.find(filter, { sort: { timestamp: -1 } });
    } catch (error) {
      logger.error(`Error finding messages by status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Find messages by recipient
   */
  async findByRecipient(
    recipient: string,
    paginationOptions?: PaginationOptions
  ): Promise<PaginatedResponse<IMessage> | IMessage[]> {
    try {
      const filter = { recipient };

      if (paginationOptions) {
        return await this.findWithPagination(filter, paginationOptions);
      }

      return await this.find(filter, { sort: { timestamp: -1 } });
    } catch (error) {
      logger.error(`Error finding messages by recipient ${recipient}:`, error);
      throw error;
    }
  }

  /**
   * Find pending messages for retry processing
   */
  async findPendingMessages(limit: number = 100): Promise<IMessage[]> {
    try {
      return await this.find(
        { status: 'pending' },
        {
          sort: { timestamp: 1 }, // Oldest first
          limit
        }
      );
    } catch (error) {
      logger.error('Error finding pending messages:', error);
      throw error;
    }
  }

  /**
   * Find failed messages within a time range for retry
   */
  async findFailedMessagesForRetry(
    hoursAgo: number = 24,
    limit: number = 100
  ): Promise<IMessage[]> {
    try {
      const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      return await this.find(
        {
          status: 'failed',
          timestamp: { $gte: cutoffTime },
        },
        {
          sort: { timestamp: 1 },
          limit,
        }
      );
    } catch (error) {
      logger.error('Error finding failed messages for retry:', error);
      throw error;
    }
  }

  /**
   * Update message status to sent
   */
  async markAsSent(messageId: string, externalMessageId?: string): Promise<IMessage | null> {
    try {
      const update: any = {
        status: 'sent',
        $unset: { errorMessage: 1 } // Remove error message if it exists
      };

      if (externalMessageId) {
        update.messageId = externalMessageId;
      }

      return await this.updateById(messageId, update);
    } catch (error) {
      logger.error(`Error marking message ${messageId} as sent:`, error);
      throw error;
    }
  }

  /**
   * Update message status to failed
   */
  async markAsFailed(messageId: string, errorMessage: string): Promise<IMessage | null> {
    try {
      return await this.updateById(messageId, {
        status: 'failed',
        errorMessage: errorMessage.substring(0, 1000), // Limit error message length
      });
    } catch (error) {
      logger.error(`Error marking message ${messageId} as failed:`, error);
      throw error;
    }
  }

  /**
   * Get message statistics grouped by service and status
   */
  async getMessageStats(): Promise<MessageStats[]> {
    try {
      const stats = await Message.aggregate([
        {
          $group: {
            _id: {
              service: '$service',
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.service',
            stats: {
              $push: {
                status: '$_id.status',
                count: '$count',
              },
            },
            total: { $sum: '$count' },
          },
        },
        {
          $project: {
            _id: 0,
            service: '$_id',
            stats: 1,
            total: 1,
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting message statistics:', error);
      throw error;
    }
  }

  /**
   * Aggregate message counts per apiKey over time buckets
   */
  async getApiKeyUsageSeries(params: {
    from: Date;
    to: Date;
    bucket: 'month' | 'week' | 'rolling4x7';
    keyId?: string;
  }): Promise<Array<{ keyId: string; period: string; count: number }>> {
    const { from, to, bucket, keyId } = params;

    if (bucket === 'rolling4x7') {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const pipeline: any[] = [
        { $match: { timestamp: { $gte: from, $lte: to }, requestedBy: keyId ? `apiKey:${keyId}` : { $regex: /^apiKey:/ } } },
        {
          $addFields: {
            keyId: { $replaceOne: { input: '$requestedBy', find: 'apiKey:', replacement: '' } },
            diffMs: { $subtract: [to, '$timestamp'] },
          },
        },
        {
          $addFields: {
            bucketIndex: { $floor: { $divide: ['$diffMs', msPerWeek] } },
          },
        },
        { $match: { bucketIndex: { $gte: 0, $lte: 3 } } },
        {
          $group: {
            _id: { keyId: '$keyId', bucketIndex: '$bucketIndex' },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            keyId: '$_id.keyId',
            period: { $concat: ['W', { $toString: '$_id.bucketIndex' }] },
            count: 1,
          },
        },
        { $sort: { period: 1, keyId: 1 } },
      ];
      // @ts-ignore
      return await this.model.aggregate(pipeline);
    }

    const dateFormat = bucket === 'month' ? '%Y-%m' : '%G-%V'; // ISO week for week
    const pipeline: any[] = [
      { $match: { timestamp: { $gte: from, $lte: to }, requestedBy: keyId ? `apiKey:${keyId}` : { $regex: /^apiKey:/ } } },
      {
        $addFields: {
          keyId: { $replaceOne: { input: '$requestedBy', find: 'apiKey:', replacement: '' } },
          period: { $dateToString: { format: dateFormat, date: '$timestamp' } },
        },
      },
      { $group: { _id: { keyId: '$keyId', period: '$period' }, count: { $sum: 1 } } },
      { $project: { _id: 0, keyId: '$_id.keyId', period: '$_id.period', count: 1 } },
      { $sort: { period: 1, keyId: 1 } },
    ];
    // @ts-ignore
    return await this.model.aggregate(pipeline);
  }

  /**
   * Get message statistics for a specific time period
   */
  async getMessageStatsForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<MessageStats[]> {
    try {
      const stats = await Message.aggregate([
        {
          $match: {
            timestamp: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              service: '$service',
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.service',
            stats: {
              $push: {
                status: '$_id.status',
                count: '$count',
              },
            },
            total: { $sum: '$count' },
          },
        },
        {
          $project: {
            _id: 0,
            service: '$_id',
            stats: 1,
            total: 1,
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting message statistics for period:', error);
      throw error;
    }
  }

  /**
   * Delete old messages beyond retention period
   */
  async deleteOldMessages(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const result = await this.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      logger.info(`Deleted ${result.deletedCount} old messages beyond ${retentionDays} days`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error deleting old messages:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB filter query from MessageFilters
   */
  private buildFilterQuery(filters: MessageFilters): FilterQuery<IMessage> {
    const query: FilterQuery<IMessage> = {};

    if (filters.service) {
      query.service = filters.service;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.recipient) {
      query.recipient = { $regex: filters.recipient, $options: 'i' };
    }

    if (filters.requestedBy) {
      query.requestedBy = filters.requestedBy as any;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.timestamp = {};
      if (filters.dateFrom) {
        query.timestamp.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.timestamp.$lte = filters.dateTo;
      }
    }

    if (filters.search) {
      query.$or = [
        { message: { $regex: filters.search, $options: 'i' } },
        { recipient: { $regex: filters.search, $options: 'i' } },
        { errorMessage: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return query;
  }

  /**
   * Bulk create messages for batch processing
   */
  async bulkCreate(messages: Partial<IMessage>[]): Promise<IMessage[]> {
    try {
      return await Message.insertMany(messages, { ordered: false });
    } catch (error) {
      logger.error('Error bulk creating messages:', error);
      throw error;
    }
  }

  /**
   * Get recent message activity for dashboard
   */
  async getRecentActivity(limit: number = 50): Promise<IMessage[]> {
    try {
      return await this.find(
        {},
        {
          sort: { timestamp: -1 },
          limit,
        }
      );
    } catch (error) {
      logger.error('Error getting recent message activity:', error);
      throw error;
    }
  }
}

export default MessageRepository;