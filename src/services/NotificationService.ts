import { NotificationRequest, HealthCheckResponse } from '@/types';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
import BaileysWhatsAppProvider from '@/services/providers/BaileysWhatsAppProvider';
import GramJSTelegramProvider from '@/services/providers/GramJSTelegramProvider';
import MattermostProvider from '@/services/providers/MattermostProvider';
import MessageQueueService from '@/services/MessageQueueService';
import db from '@/database/connection';
import logger from '@/utils/logger';

export class NotificationService {

    private statusRepository: ServiceStatusRepository;
    private whatsapp: BaileysWhatsAppProvider;
    private telegram: GramJSTelegramProvider;
    private mattermost: MattermostProvider;
    private queueService: MessageQueueService;

    constructor(
        deps?: {
            statusRepository?: ServiceStatusRepository;
            whatsapp?: BaileysWhatsAppProvider;
            telegram?: GramJSTelegramProvider;
            mattermost?: MattermostProvider;
            queueService?: MessageQueueService;
        }
    ) {
        this.statusRepository = deps?.statusRepository ?? new ServiceStatusRepository();
        this.whatsapp = deps?.whatsapp ?? new BaileysWhatsAppProvider();
        this.telegram = deps?.telegram ?? new GramJSTelegramProvider();
        this.mattermost = deps?.mattermost ?? new MattermostProvider();
        this.queueService = deps?.queueService ?? new MessageQueueService();
    }

    public async init(): Promise<void> {
        await db.connect();

        // Load existing telegram credentials if available
        await this.telegram.loadExistingCredentials();

        // Initialize WhatsApp (will generate QR or restore session)
        await this.whatsapp.init();

        // Auto-connect telegram if a session string exists (no user interaction required)
        if (this.telegram.isConfigured() && (this.telegram as any).canAutoConnect && (this.telegram as any).canAutoConnect()) {
            try {
                await this.telegram.connect();
                logger.info('Telegram auto-connected using stored session');
            } catch (err) {
                logger.warn('Telegram auto-connect failed; manual connect required');
            }
        } else if (this.telegram.isConfigured()) {
            logger.info('Telegram credentials configured, ready for manual connection');
        }

        // Initialize service status records
        await this.statusRepository.initializeDefaultStatuses();

        // Start message queue processing
        this.queueService.start();
    }

    public getProviders() {
        return { whatsapp: this.whatsapp, telegram: this.telegram, mattermost: this.mattermost };
    }

    public async sendWhatsApp(request: NotificationRequest) {
        if (!this.whatsapp.isConnected()) {
            return { success: false, error: 'WhatsApp authentication required' };
        }
        const result = await this.whatsapp.sendText(request.recipient, request.message, request.metadata);
        return result.success
            ? { success: true, messageId: result.externalMessageId }
            : { success: false, error: result.errorMessage };
    }

    public async sendTelegram(request: NotificationRequest) {
        if (!this.telegram.isConnected()) {
            return { success: false, error: 'Telegram not configured or connected' };
        }
        const result = await this.telegram.sendText(request.recipient, request.message, request.metadata);
        return result.success
            ? { success: true, messageId: result.externalMessageId }
            : { success: false, error: result.errorMessage };
    }
    public async sendMattermost(request: NotificationRequest) {
        if (!this.mattermost.isServiceConnected()) {
            return { success: false, error: 'Mattermost not configured or connected' };
        }
        const result = await this.mattermost.sendText(request.recipient, request.message, request.metadata);
        return result.success
            ? { success: true, messageId: result.messageId }
            : { success: false, error: result.errorMessage };
    }

    public async health(version: string): Promise<HealthCheckResponse> {
        const dbHealth = await db.healthCheck();
        const services = await this.statusRepository.getServiceHealthStatus();
        const overallHealthy = dbHealth.status === 'connected' &&
            ['connected', 'not_configured'].includes(services.whatsapp) &&
            ['connected', 'not_configured'].includes(services.telegram) &&
            ['connected', 'not_configured'].includes(services.mattermost);

        return {
            status: overallHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
                database: dbHealth.status,
                whatsapp: services.whatsapp === 'not_configured' ? 'not_configured' :
                        services.whatsapp === 'connected' ? 'connected' : 'disconnected',
                telegram: services.telegram === 'not_configured' ? 'not_configured' :
                    services.telegram === 'connected' ? 'connected' : 'disconnected',
                mattermost: services.mattermost === 'not_configured' ? 'not_configured' :
                    services.mattermost === 'connected' ? 'connected' : 'disconnected',
            },
            uptime: process.uptime(),
            version,
        };
    }
}

export default NotificationService;


