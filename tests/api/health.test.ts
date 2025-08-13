import request from 'supertest';
import buildApp from '@/api/server';
import NotificationService from '@/services/NotificationService';

describe('Health API', () => {
    let app: any;
    let service: NotificationService;

    beforeAll(async () => {
        // Create a mock service for testing
        service = {
            health: jest.fn().mockResolvedValue({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'connected',
                    whatsapp: 'not_configured',
                    telegram: 'not_configured',
                },
                uptime: 123,
                version: '1.0.0',
            }),
            getProviders: jest.fn(),
            sendWhatsApp: jest.fn(),
            sendTelegram: jest.fn(),
            init: jest.fn(),
        } as any;

        app = buildApp(service);
    });

    it('should return health status', async () => {
        const response = await request(app)
            .get('/api/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('services');
        expect(response.body.services).toHaveProperty('database');
        expect(response.body.services).toHaveProperty('whatsapp');
        expect(response.body.services).toHaveProperty('telegram');
    });

    it('should return 503 when service is unhealthy', async () => {
        service.health = jest.fn().mockResolvedValue({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'disconnected',
                whatsapp: 'not_configured',
                telegram: 'not_configured',
            },
            uptime: 123,
            version: '1.0.0',
        });

        await request(app)
            .get('/api/health')
            .expect(503);
    });
});
