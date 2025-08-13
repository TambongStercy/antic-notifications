import { config } from '@/config/environment';
import NotificationService from '@/services/NotificationService';
import buildApp from '@/api/server';
import logger from '@/utils/logger';
import WebSocketService from '@/services/WebSocketServer';

async function main() {
    const service = new NotificationService();
    await service.init();

    // Note: WhatsApp will initialize and show QR code if not authenticated
    // Telegram will auto-connect if token exists in database

    const app = buildApp(service);
    app.listen(config.port, () => {
        logger.info(`API server listening on port ${config.port}`);
        logger.info(`Health check: http://localhost:${config.port}/api/health`);
        logger.info(`Admin login: POST http://localhost:${config.port}/api/admin/login`);
    });

    // Start WebSocket server for real-time updates
    new WebSocketService(service).start();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        try {
            const { whatsapp, telegram } = service.getProviders();
            await Promise.all([
                whatsapp.disconnect(),
                telegram.disconnect()
            ]);
            logger.info('All services disconnected successfully');
        } catch (error) {
            logger.error('Error during shutdown:', error);
        }
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT')); // Handle Ctrl+C
}

main().catch((err) => {
    logger.error('Fatal startup error', err);
    process.exit(1);
});


