import mongoose from 'mongoose';
import { ServiceStatusRepository, ServiceStatusUpdate } from '@/database/repositories/ServiceStatusRepository';
import { ServiceStatus, IServiceStatus } from '@/database/models/ServiceStatus';
import { ServiceType, ConnectionStatus } from '@/types';

describe('ServiceStatusRepository', () => {
  let repository: ServiceStatusRepository;

  beforeEach(() => {
    repository = new ServiceStatusRepository();
  });

  const createTestServiceStatus = async (
    service: ServiceType,
    overrides: Partial<IServiceStatus> = {}
  ): Promise<IServiceStatus> => {
    const defaultData = {
      service,
      status: 'disconnected' as ConnectionStatus,
      lastUpdated: new Date(),
      metadata: {},
      ...overrides,
    };
    return await repository.create(defaultData);
  };

  describe('findByService', () => {
    beforeEach(async () => {
      await createTestServiceStatus('whatsapp', { status: 'connected' });
      await createTestServiceStatus('telegram', { status: 'disconnected' });
    });

    it('should find service status by service type', async () => {
      const result = await repository.findByService('whatsapp');

      expect(result).toBeDefined();
      expect(result!.service).toBe('whatsapp');
      expect(result!.status).toBe('connected');
    });

    it('should return null for non-existent service', async () => {
      // Clear all data first
      await ServiceStatus.deleteMany({});
      
      const result = await repository.findByService('whatsapp');

      expect(result).toBeNull();
    });
  });

  describe('updateServiceStatus', () => {
    it('should create new service status if not exists', async () => {
      const statusUpdate: ServiceStatusUpdate = {
        status: 'connected',
        metadata: { connectionInfo: { connected: true } },
      };

      const result = await repository.updateServiceStatus('whatsapp', statusUpdate);

      expect(result).toBeDefined();
      expect(result.service).toBe('whatsapp');
      expect(result.status).toBe('connected');
      expect(result.metadata?.connectionInfo).toEqual({ connected: true });
    });

    it('should update existing service status', async () => {
      await createTestServiceStatus('whatsapp', { status: 'disconnected' });

      const statusUpdate: ServiceStatusUpdate = {
        status: 'connected',
        metadata: { connectionInfo: { sessionId: '123' } },
      };

      const result = await repository.updateServiceStatus('whatsapp', statusUpdate);

      expect(result.status).toBe('connected');
      expect(result.metadata?.connectionInfo).toEqual({ sessionId: '123' });
    });

    it('should merge metadata instead of replacing', async () => {
      await createTestServiceStatus('whatsapp', {
        metadata: { qrCode: 'existing-qr', connectionInfo: { oldData: true } },
      });

      const statusUpdate: ServiceStatusUpdate = {
        status: 'connected',
        metadata: { connectionInfo: { newData: true } },
      };

      const result = await repository.updateServiceStatus('whatsapp', statusUpdate);

      expect(result.metadata?.qrCode).toBe('existing-qr');
      expect(result.metadata?.connectionInfo).toEqual({ newData: true });
    });
  });

  describe('getAllStatuses', () => {
    beforeEach(async () => {
      await createTestServiceStatus('whatsapp', {
        status: 'connected',
        metadata: { qrCode: 'secret-qr', botToken: 'secret-token' },
      });
      await createTestServiceStatus('telegram', { status: 'disconnected' });
    });

    it('should return all statuses without sensitive data', async () => {
      const result = await repository.getAllStatuses();

      expect(result).toHaveLength(2);
      expect(result.find(s => s.service === 'whatsapp')).toBeDefined();
      expect(result.find(s => s.service === 'telegram')).toBeDefined();
      
      // Should not include sensitive data
      const whatsappStatus = result.find(s => s.service === 'whatsapp');
      expect(whatsappStatus!.metadata?.qrCode).toBeUndefined();
      expect(whatsappStatus!.metadata?.botToken).toBeUndefined();
    });
  });

  describe('getConnectedServices', () => {
    beforeEach(async () => {
      await createTestServiceStatus('whatsapp', { status: 'connected' });
      await createTestServiceStatus('telegram', { status: 'disconnected' });
    });

    it('should return only connected services', async () => {
      const result = await repository.getConnectedServices();

      expect(result).toHaveLength(1);
      expect(result[0].service).toBe('whatsapp');
      expect(result[0].status).toBe('connected');
    });
  });

  describe('WhatsApp QR Code methods', () => {
    describe('setWhatsAppQRCode', () => {
      it('should set QR code and mark as authenticating', async () => {
        const qrCode = 'test-qr-code';
        const result = await repository.setWhatsAppQRCode(qrCode);

        expect(result.service).toBe('whatsapp');
        expect(result.status).toBe('authenticating');
        expect(result.metadata?.qrCode).toBe(qrCode);
      });
    });

    describe('getWhatsAppQRCode', () => {
      it('should return QR code for WhatsApp service', async () => {
        const qrCode = 'test-qr-code';
        await repository.setWhatsAppQRCode(qrCode);

        const result = await repository.getWhatsAppQRCode();

        expect(result).toBe(qrCode);
      });

      it('should return null if no QR code exists', async () => {
        const result = await repository.getWhatsAppQRCode();

        expect(result).toBeNull();
      });
    });

    describe('clearWhatsAppQRCode', () => {
      it('should clear QR code from WhatsApp service', async () => {
        await repository.setWhatsAppQRCode('test-qr-code');
        const result = await repository.clearWhatsAppQRCode();

        expect(result).toBeDefined();
        expect(result!.metadata?.qrCode).toBeUndefined();

        const qrCode = await repository.getWhatsAppQRCode();
        expect(qrCode).toBeNull();
      });
    });
  });

  describe('Telegram Bot Token methods', () => {
    describe('setTelegramBotToken', () => {
      it('should set bot token and mark as disconnected initially', async () => {
        const botToken = 'test-bot-token';
        const result = await repository.setTelegramBotToken(botToken);

        expect(result.service).toBe('telegram');
        expect(result.status).toBe('disconnected');
        expect(result.metadata?.botToken).toBe(botToken);
      });
    });

    describe('getTelegramBotToken', () => {
      it('should return bot token for Telegram service', async () => {
        const botToken = 'test-bot-token';
        await repository.setTelegramBotToken(botToken);

        const result = await repository.getTelegramBotToken();

        expect(result).toBe(botToken);
      });

      it('should return null if no bot token exists', async () => {
        const result = await repository.getTelegramBotToken();

        expect(result).toBeNull();
      });
    });

    describe('clearTelegramBotToken', () => {
      it('should clear bot token and mark as disconnected', async () => {
        await repository.setTelegramBotToken('test-bot-token');
        const result = await repository.clearTelegramBotToken();

        expect(result).toBeDefined();
        expect(result!.status).toBe('disconnected');

        const botToken = await repository.getTelegramBotToken();
        expect(botToken).toBeNull();
      });
    });
  });

  describe('Connection status methods', () => {
    describe('markAsConnected', () => {
      it('should mark service as connected', async () => {
        const connectionInfo = { sessionId: '123', connected: true };
        const result = await repository.markAsConnected('whatsapp', connectionInfo);

        expect(result.service).toBe('whatsapp');
        expect(result.status).toBe('connected');
        expect(result.metadata?.connectionInfo).toEqual(connectionInfo);
      });

      it('should mark service as connected without connection info', async () => {
        const result = await repository.markAsConnected('telegram');

        expect(result.service).toBe('telegram');
        expect(result.status).toBe('connected');
      });
    });

    describe('markAsDisconnected', () => {
      it('should mark service as disconnected', async () => {
        await createTestServiceStatus('whatsapp', { status: 'connected' });
        const result = await repository.markAsDisconnected('whatsapp');

        expect(result.status).toBe('disconnected');
      });
    });

    describe('markAsAuthenticating', () => {
      it('should mark service as authenticating', async () => {
        const result = await repository.markAsAuthenticating('whatsapp');

        expect(result.service).toBe('whatsapp');
        expect(result.status).toBe('authenticating');
      });
    });
  });

  describe('Status check methods', () => {
    beforeEach(async () => {
      await createTestServiceStatus('whatsapp', { status: 'connected' });
      await createTestServiceStatus('telegram', { status: 'authenticating' });
    });

    describe('isServiceConnected', () => {
      it('should return true for connected service', async () => {
        const result = await repository.isServiceConnected('whatsapp');

        expect(result).toBe(true);
      });

      it('should return false for non-connected service', async () => {
        const result = await repository.isServiceConnected('telegram');

        expect(result).toBe(false);
      });
    });

    describe('isServiceAuthenticating', () => {
      it('should return true for authenticating service', async () => {
        const result = await repository.isServiceAuthenticating('telegram');

        expect(result).toBe(true);
      });

      it('should return false for non-authenticating service', async () => {
        const result = await repository.isServiceAuthenticating('whatsapp');

        expect(result).toBe(false);
      });
    });
  });

  describe('getServiceHealthStatus', () => {
    beforeEach(async () => {
      await createTestServiceStatus('whatsapp', { status: 'connected' });
      await createTestServiceStatus('telegram', { status: 'disconnected' });
    });

    it('should return health status for all services', async () => {
      const result = await repository.getServiceHealthStatus();

      expect(result).toEqual({
        whatsapp: 'connected',
        telegram: 'disconnected',
      });
    });

    it('should return not_configured for missing services', async () => {
      await ServiceStatus.deleteMany({});
      
      const result = await repository.getServiceHealthStatus();

      expect(result).toEqual({
        whatsapp: 'not_configured',
        telegram: 'not_configured',
      });
    });
  });

  describe('clearSensitiveData', () => {
    it('should clear sensitive data for a service', async () => {
      await createTestServiceStatus('whatsapp', {
        metadata: { qrCode: 'secret-qr', botToken: 'secret-token', connectionInfo: { keep: true } },
      });

      const result = await repository.clearSensitiveData('whatsapp');

      expect(result).toBeDefined();
      expect(result!.metadata?.qrCode).toBeUndefined();
      expect(result!.metadata?.botToken).toBeUndefined();
      expect(result!.metadata?.connectionInfo).toEqual({ keep: true });
    });
  });

  describe('initializeDefaultStatuses', () => {
    it('should create default statuses for services that do not exist', async () => {
      await repository.initializeDefaultStatuses();

      const whatsappStatus = await repository.findByService('whatsapp');
      const telegramStatus = await repository.findByService('telegram');

      expect(whatsappStatus).toBeDefined();
      expect(whatsappStatus!.status).toBe('disconnected');
      expect(telegramStatus).toBeDefined();
      expect(telegramStatus!.status).toBe('disconnected');
    });

    it('should not overwrite existing statuses', async () => {
      await createTestServiceStatus('whatsapp', { status: 'connected' });
      await repository.initializeDefaultStatuses();

      const whatsappStatus = await repository.findByService('whatsapp');
      expect(whatsappStatus!.status).toBe('connected'); // Should remain unchanged
    });
  });

  describe('getServicesNeedingAttention', () => {
    beforeEach(async () => {
      await createTestServiceStatus('whatsapp', { 
        status: 'disconnected',
        lastUpdated: new Date(Date.now() - 1000)
      });
      await createTestServiceStatus('telegram', { 
        status: 'authenticating',
        lastUpdated: new Date(Date.now() - 2000)
      });
    });

    it('should return services that are disconnected or authenticating', async () => {
      const result = await repository.getServicesNeedingAttention();

      expect(result).toHaveLength(2);
      expect(result.find(s => s.service === 'whatsapp')).toBeDefined();
      expect(result.find(s => s.service === 'telegram')).toBeDefined();
      
      // Should be ordered by lastUpdated descending
      expect(result[0].service).toBe('whatsapp'); // More recent
      expect(result[1].service).toBe('telegram');
    });

    it('should not return connected services', async () => {
      await repository.markAsConnected('whatsapp');
      
      const result = await repository.getServicesNeedingAttention();

      expect(result).toHaveLength(1);
      expect(result[0].service).toBe('telegram');
    });
  });

  describe('updateConnectionInfo', () => {
    it('should update connection info and mark as connected', async () => {
      const connectionInfo = { sessionId: '123', version: '1.0' };
      const result = await repository.updateConnectionInfo('whatsapp', connectionInfo);

      expect(result).toBeDefined();
      expect(result!.status).toBe('connected');
      expect(result!.metadata?.connectionInfo).toEqual(connectionInfo);
    });
  });
});