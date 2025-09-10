import { config } from '@/config/environment';
import NotificationService from '@/services/NotificationService';
import buildApp from '@/api/server';
import logger from '@/utils/logger';
import { GlobalErrorSuppressor } from '@/utils/globalErrorSuppressor';
import https from 'https';
import fs from 'fs';

async function main() {
    // Initialize global error suppressor to reduce third-party library noise
    GlobalErrorSuppressor.init();
    
    const service = new NotificationService();
    await service.init();

    // Note: WhatsApp will initialize and show QR code if not authenticated
    // Telegram will auto-connect if token exists in database

    const app = buildApp(service);
    
    // Start HTTP server
    app.listen(config.port, () => {
        logger.info(`HTTP API server listening on port ${config.port}`);
        logger.info(`Health check: http://localhost:${config.port}/api/health`);
    });

    // Start HTTPS server if SSL certificates are configured
    if (config.ssl.certPath && config.ssl.keyPath) {
        try {
            const httpsOptions = {
                cert: fs.readFileSync(config.ssl.certPath),
                key: fs.readFileSync(config.ssl.keyPath),
                ca: config.ssl.intermediatePath ? fs.readFileSync(config.ssl.intermediatePath) : undefined
            };

            https.createServer(httpsOptions, app).listen(config.httpsPort, () => {
                logger.info(`HTTPS API server listening on port ${config.httpsPort}`);
                logger.info(`Secure health check: https://localhost:${config.httpsPort}/api/health`);
                logger.info(`Secure admin login: POST https://localhost:${config.httpsPort}/api/admin/login`);
            });
        } catch (error) {
            logger.error('Failed to start HTTPS server:', error);
            logger.info('Continuing with HTTP only...');
        }
    } else {
        logger.info('SSL certificates not configured, running HTTP only');
    }


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


