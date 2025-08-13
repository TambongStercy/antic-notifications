import request from 'supertest';
import buildApp from '@/api/server';
import NotificationService from '@/services/NotificationService';

describe('Notifications API', () => {
    let app: any;
    let service: NotificationService;

    beforeAll(async () => {
        service = {
            sendWhatsApp: jest.fn(),
            sendTelegram: jest.fn(),
            health: jest.fn(),
            getProviders: jest.fn(),
            init: jest.fn(),
        } as any;

        app = buildApp(service);
    });

    describe('POST /api/notifications/whatsapp', () => {
        it('should send WhatsApp message successfully', async () => {
            service.sendWhatsApp = jest.fn().mockResolvedValue({
                success: true,
                messageId: 'wa_123456789',
            });

            const response = await request(app)
                .post('/api/notifications/whatsapp')
                .send({
                    recipient: '+237123456789',
                    message: 'Test message',
                })
                .expect(200);

            expect(response.body).toHaveProperty('messageId', 'wa_123456789');
            expect(service.sendWhatsApp).toHaveBeenCalledWith({
                recipient: '+237123456789',
                message: 'Test message',
            });
        });

        it('should return error when WhatsApp send fails', async () => {
            service.sendWhatsApp = jest.fn().mockResolvedValue({
                success: false,
                error: 'WhatsApp not connected',
            });

            await request(app)
                .post('/api/notifications/whatsapp')
                .send({
                    recipient: '+237123456789',
                    message: 'Test message',
                })
                .expect(400);
        });

        it('should validate request body', async () => {
            await request(app)
                .post('/api/notifications/whatsapp')
                .send({
                    recipient: '', // Invalid
                    message: 'Test message',
                })
                .expect(400);
        });
    });

    describe('POST /api/notifications/telegram', () => {
        it('should send Telegram message successfully', async () => {
            service.sendTelegram = jest.fn().mockResolvedValue({
                success: true,
                messageId: 'tg_123456789',
            });

            const response = await request(app)
                .post('/api/notifications/telegram')
                .send({
                    recipient: '@testuser',
                    message: 'Test message',
                })
                .expect(200);

            expect(response.body).toHaveProperty('messageId', 'tg_123456789');
        });

        it('should validate Telegram recipient format', async () => {
            await request(app)
                .post('/api/notifications/telegram')
                .send({
                    recipient: 'invalid-format',
                    message: 'Test message',
                })
                .expect(400);
        });
    });
});
