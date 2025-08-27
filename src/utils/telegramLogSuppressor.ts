import logger from './logger';

/**
 * Suppress noisy Telegram logs that are not critical
 */
export class TelegramLogSuppressor {
    private static isActive = false;

    public static init(): void {
        if (this.isActive) return;
        
        this.isActive = true;

        // Intercept uncaught exceptions and unhandled rejections
        process.on('uncaughtException', (error) => {
            if (this.shouldSuppressError(error)) {
                // Suppress Telegram network errors
                return;
            }
            
            // Let other errors through
            logger.error('Uncaught exception:', error);
        });

        process.on('unhandledRejection', (reason: any) => {
            if (this.shouldSuppressError(reason)) {
                // Suppress Telegram network errors
                return;
            }
            
            // Let other errors through
            logger.error('Unhandled rejection:', reason);
        });

        // Override console methods with more aggressive filtering
        const originalError = console.error;
        const originalLog = console.log;
        const originalWarn = console.warn;

        console.error = (...args: any[]) => {
            const message = args.join(' ');
            if (!this.shouldSuppressMessage(message)) {
                originalError.apply(console, args);
            }
        };

        console.log = (...args: any[]) => {
            const message = args.join(' ');
            if (!this.shouldSuppressMessage(message)) {
                originalLog.apply(console, args);
            }
        };

        console.warn = (...args: any[]) => {
            const message = args.join(' ');
            if (!this.shouldSuppressMessage(message)) {
                originalWarn.apply(console, args);
            }
        };

        logger.info('Telegram log suppressor initialized');
    }

    private static shouldSuppressError(error: any): boolean {
        if (!error) return false;
        
        const message = error.message || error.toString();
        return this.shouldSuppressMessage(message);
    }

    private static shouldSuppressMessage(message: string): boolean {
        if (!message || typeof message !== 'string') return false;
        
        const suppressPatterns = [
            'Error: TIMEOUT',
            'TIMEOUT',
            'Not connected',
            'Connection closed',
            'Reconnecting',
            'Started reconnecting',
            'Closing current connection',
            'Disconnecting from',
            'Connecting to',
            'Connection to',
            'complete!',
            'Handling reconnect',
            'connection closed',
            'Connection closed while receiving data',
            'at _updateLoop',
            'at attempts',
            'updates.js:250:85',
            'updates.js:234:20',
            'updates.js:184:17',
            'gramJS version',
            'Using LAYER',
            'Signed in successfully',
            '[INFO]',
            '[WARN]',
            'Running gramJS',
            'TCPFull'
        ];

        return suppressPatterns.some(pattern =>
            message.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    private static shouldSuppressInfoMessage(message: string): boolean {
        const suppressPatterns = [
            '[INFO]',
            '[WARN]',
            'Connecting to',
            'Connection to',
            'Disconnecting from',
            'Started reconnecting',
            'Handling reconnect'
        ];

        return suppressPatterns.some(pattern =>
            message.includes(pattern)
        );
    }

    public static restore(): void {
        this.isActive = false;
        // Note: We don't restore console methods to avoid complexity
        // The suppression will remain active for the lifetime of the process
        logger.info('Telegram log suppressor deactivated');
    }
}