import { BaseRepository } from './BaseRepository';
import { ServiceStatus, IServiceStatus } from '@/database/models/ServiceStatus';
import { ServiceType, ConnectionStatus } from '@/types';
import logger from '@/utils/logger';

export interface ServiceStatusUpdate {
  status: ConnectionStatus;
  metadata?: Partial<IServiceStatus['metadata']>;
}

export class ServiceStatusRepository extends BaseRepository<IServiceStatus> {
  constructor() {
    super(ServiceStatus);
  }

  /**
   * Find service status by service type
   */
  async findByService(service: ServiceType): Promise<IServiceStatus | null> {
    try {
      return await this.findOne({ service });
    } catch (error) {
      logger.error(`Error finding service status for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Update or create service status
   */
  async updateServiceStatus(
    service: ServiceType,
    statusUpdate: ServiceStatusUpdate
  ): Promise<IServiceStatus> {
    try {
      const { status, metadata } = statusUpdate;

      const updateData: any = {
        status,
        lastUpdated: new Date(),
      };

      if (metadata) {
        // Merge metadata instead of replacing
        updateData.$set = {};
        Object.keys(metadata).forEach(key => {
          updateData.$set[`metadata.${key}`] = metadata[key as keyof typeof metadata];
        });
      }

      const result = await ServiceStatus.findOneAndUpdate(
        { service },
        updateData,
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      if (!result) {
        throw new Error(`Failed to update service status for ${service}`);
      }

      logger.info(`Updated ${service} service status to ${status}`);
      return result;
    } catch (error) {
      logger.error(`Error updating service status for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Get all service statuses (without sensitive data)
   */
  async getAllStatuses(): Promise<IServiceStatus[]> {
    try {
      return await this.find({}, {
        select: '-metadata.qrCode -metadata.botToken',
        sort: { service: 1 },
      });
    } catch (error) {
      logger.error('Error getting all service statuses:', error);
      throw error;
    }
  }

  /**
   * Get connected services only
   */
  async getConnectedServices(): Promise<IServiceStatus[]> {
    try {
      return await this.find(
        { status: 'connected' },
        {
          select: 'service status lastUpdated',
          sort: { service: 1 },
        }
      );
    } catch (error) {
      logger.error('Error getting connected services:', error);
      throw error;
    }
  }

  /**
   * Set WhatsApp QR code
   */
  async setWhatsAppQRCode(qrCode: string): Promise<IServiceStatus> {
    try {
      return await this.updateServiceStatus('whatsapp', {
        status: 'disconnected', // Keep as disconnected until actually connected
        metadata: { qrCode },
      });
    } catch (error) {
      logger.error('Error setting WhatsApp QR code:', error);
      throw error;
    }
  }

  /**
   * Get WhatsApp QR code (includes sensitive data)
   */
  async getWhatsAppQRCode(): Promise<string | null> {
    try {
      const status = await ServiceStatus.findOne({ service: 'whatsapp' })
        .select('+metadata.qrCode')
        .exec();

      return status?.metadata?.qrCode || null;
    } catch (error) {
      logger.error('Error getting WhatsApp QR code:', error);
      throw error;
    }
  }

  /**
   * Clear WhatsApp QR code
   */
  async clearWhatsAppQRCode(): Promise<IServiceStatus | null> {
    try {
      return await ServiceStatus.findOneAndUpdate(
        { service: 'whatsapp' },
        {
          $unset: { 'metadata.qrCode': 1 },
          lastUpdated: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      logger.error('Error clearing WhatsApp QR code:', error);
      throw error;
    }
  }

  /**
   * Set Telegram bot token
   */
  async setTelegramBotToken(botToken: string): Promise<IServiceStatus> {
    try {
      return await this.updateServiceStatus('telegram', {
        status: 'disconnected', // Will be updated to connected after validation
        metadata: { botToken },
      });
    } catch (error) {
      logger.error('Error setting Telegram bot token:', error);
      throw error;
    }
  }

  /**
   * Get Telegram bot token (includes sensitive data)
   */
  async getTelegramBotToken(): Promise<string | null> {
    try {
      const status = await ServiceStatus.findOne({ service: 'telegram' })
        .select('+metadata.botToken')
        .exec();

      return status?.metadata?.botToken || null;
    } catch (error) {
      logger.error('Error getting Telegram bot token:', error);
      throw error;
    }
  }

  /**
   * Clear Telegram bot token
   */
  async clearTelegramBotToken(): Promise<IServiceStatus | null> {
    try {
      return await this.updateServiceStatus('telegram', {
        status: 'disconnected',
        metadata: { botToken: undefined },
      });
    } catch (error) {
      logger.error('Error clearing Telegram bot token:', error);
      throw error;
    }
  }

  /**
   * Set Telegram credentials (for GramJS)
   */
  async setTelegramCredentials(credentials: any): Promise<IServiceStatus> {
    try {
      return await this.updateServiceStatus('telegram', {
        status: 'disconnected',
        metadata: { credentials }
      });
    } catch (error) {
      logger.error('Error setting Telegram credentials:', error);
      throw error;
    }
  }

  /**
   * Get Telegram credentials from metadata
   */
  async getTelegramCredentials(): Promise<any | null> {
    try {
      const status = await ServiceStatus.findOne({ service: 'telegram' })
        .select('+metadata.credentials')
        .exec();

      return status?.metadata?.credentials || null;
    } catch (error) {
      logger.error('Error getting Telegram credentials:', error);
      return null;
    }
  }

  /**
   * Update connection info for a service
   */
  async updateConnectionInfo(
    service: ServiceType,
    connectionInfo: any
  ): Promise<IServiceStatus | null> {
    try {
      return await this.updateServiceStatus(service, {
        status: 'connected',
        metadata: { connectionInfo },
      });
    } catch (error) {
      logger.error(`Error updating connection info for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Mark service as connected
   */
  async markAsConnected(
    service: ServiceType,
    connectionInfo?: any
  ): Promise<IServiceStatus> {
    try {
      const metadata = connectionInfo ? { connectionInfo } : undefined;

      logger.info(`Marking ${service} as connected`, { connectionInfo });

      return await this.updateServiceStatus(service, {
        status: 'connected',
        metadata,
      });
    } catch (error) {
      logger.error(`Error marking ${service} as connected:`, error);
      throw error;
    }
  }

  /**
   * Mark service as disconnected
   */
  async markAsDisconnected(service: ServiceType): Promise<IServiceStatus> {
    try {
      logger.info(`Marking ${service} as disconnected`);

      return await this.updateServiceStatus(service, {
        status: 'disconnected',
      });
    } catch (error) {
      logger.error(`Error marking ${service} as disconnected:`, error);
      throw error;
    }
  }


  /**
   * Check if service is connected
   */
  async isServiceConnected(service: ServiceType): Promise<boolean> {
    try {
      const status = await this.findByService(service);
      return status?.status === 'connected';
    } catch (error) {
      logger.error(`Error checking if ${service} is connected:`, error);
      return false;
    }
  }



  /**
   * Clear all sensitive data for a service
   */
  async clearSensitiveData(service: ServiceType): Promise<IServiceStatus | null> {
    try {
      return await ServiceStatus.findOneAndUpdate(
        { service },
        {
          $unset: {
            'metadata.qrCode': 1,
            'metadata.botToken': 1,
          },
          lastUpdated: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error clearing sensitive data for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Initialize default service statuses if they don't exist
   */
  async initializeDefaultStatuses(): Promise<void> {
    try {
      const services: ServiceType[] = ['whatsapp', 'telegram', 'mattermost'];

      for (const service of services) {
        const exists = await this.exists({ service });

        if (!exists) {
          await this.create({
            service,
            status: 'disconnected',
            lastUpdated: new Date(),
            metadata: {},
          } as Partial<IServiceStatus>);

          logger.info(`Initialized default status for ${service} service`);
        }
      }
    } catch (error) {
      logger.error('Error initializing default service statuses:', error);
      throw error;
    }
  }

  /**
   * Get services that need attention (disconnected or failed)
   */
  async getServicesNeedingAttention(): Promise<IServiceStatus[]> {
    try {
      return await this.find(
        {
          status: { $in: ['disconnected'] },
        },
        {
          sort: { lastUpdated: -1 },
        }
      );
    } catch (error) {
      logger.error('Error getting services needing attention:', error);
      throw error;
    }
  }


  /**
   * Get service health status for health check endpoint
   */
  async getServiceHealthStatus(): Promise<Record<ServiceType, ConnectionStatus | 'not_configured'>> {
    try {
      const statuses = await this.getAllStatuses();

      const healthStatus: Record<ServiceType, ConnectionStatus | 'not_configured'> = {
        whatsapp: 'not_configured',
        telegram: 'not_configured',
        mattermost: 'not_configured',
      };

      statuses.forEach(status => {
        healthStatus[status.service] = status.status;
      });

      return healthStatus;
    } catch (error) {
      logger.error('Error getting service health status:', error);
      throw error;
    }
  }

  /**
   * Set Mattermost configuration
   */
  async setMattermostConfig(serverUrl: string, accessToken: string): Promise<IServiceStatus> {
    try {
      return await this.updateServiceStatus('mattermost', {
        status: 'disconnected',
        metadata: { serverUrl, accessToken },
      });
    } catch (error) {
      logger.error('Error setting Mattermost configuration:', error);
      throw error;
    }
  }

  /**
   * Get Mattermost configuration (includes sensitive data)
   */
  async getMattermostConfig(): Promise<{ serverUrl?: string; accessToken?: string } | null> {
    try {
      const status = await ServiceStatus.findOne({ service: 'mattermost' })
        .select('+metadata.serverUrl +metadata.accessToken')
        .exec();

      return {
        serverUrl: status?.metadata?.serverUrl || undefined,
        accessToken: status?.metadata?.accessToken || undefined,
      };
    } catch (error) {
      logger.error('Error getting Mattermost configuration:', error);
      throw error;
    }
  }

  /**
   * Clear Mattermost configuration
   */
  async clearMattermostConfig(): Promise<IServiceStatus | null> {
    try {
      return await ServiceStatus.findOneAndUpdate(
        { service: 'mattermost' },
        {
          $unset: {
            'metadata.serverUrl': 1,
            'metadata.accessToken': 1,
            'metadata.webhookUrl': 1,
          },
          status: 'disconnected',
          lastUpdated: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      logger.error('Error clearing Mattermost configuration:', error);
      throw error;
    }
  }
}

export default ServiceStatusRepository;
