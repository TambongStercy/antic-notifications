import logger from './logger';

/**
 * Global error suppressor for noisy third-party libraries
 */
export class GlobalErrorSuppressor {
    private static originalStderrWrite: any;
    private static originalStdoutWrite: any;
    private static isActive = false;

    public static init(): void {
        if (this.isActive) return;
        this.isActive = true;

        // Store original methods
        this.originalStderrWrite = process.stderr.write;
        this.originalStdoutWrite = process.stdout.write;

        // Override stderr.write to filter Telegram errors
        process.stderr.write = function(chunk: any, encoding?: any, callback?: any): boolean {
            const message = chunk.toString();
            
            // Check if this is a Telegram error we want to suppress
            if (GlobalErrorSuppressor.shouldSuppressOutput(message)) {
                // Call callback if provided to maintain proper flow
                if (typeof encoding === 'function') {
                    encoding();
                } else if (callback) {
                    callback();
                }
                return true; // Pretend we wrote it
            }
            
            // Let other errors through
            return GlobalErrorSuppressor.originalStderrWrite.call(process.stderr, chunk, encoding, callback);
        };

        // Override stdout.write to filter Telegram info logs
        process.stdout.write = function(chunk: any, encoding?: any, callback?: any): boolean {
            const message = chunk.toString();
            
            // Check if this is a Telegram log we want to suppress
            if (GlobalErrorSuppressor.shouldSuppressOutput(message)) {
                // Call callback if provided to maintain proper flow
                if (typeof encoding === 'function') {
                    encoding();
                } else if (callback) {
                    callback();
                }
                return true; // Pretend we wrote it
            }
            
            // Let other output through
            return GlobalErrorSuppressor.originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
        };

        logger.info('Global error suppressor initialized');
    }

    private static shouldSuppressOutput(message: string): boolean {
        if (!message || typeof message !== 'string') return false;

        const suppressPatterns = [
            'Error: TIMEOUT\n    at',
            'TIMEOUT\n    at',
            'updates.js:250:85',
            'updates.js:234:20', 
            'updates.js:184:17',
            '_updateLoop',
            'attempts (',
            '[INFO] - [',
            '[WARN] - [',
            'gramJS version',
            'Using LAYER',
            'Connecting to',
            'Connection to',
            'Disconnecting from',
            'connection closed',
            'Connection closed',
            'Started reconnecting',
            'Closing current connection',
            'Handling reconnect',
            'Signed in successfully',
            'TCPFull'
        ];

        return suppressPatterns.some(pattern => message.includes(pattern));
    }

    public static restore(): void {
        if (!this.isActive) return;
        
        process.stderr.write = this.originalStderrWrite;
        process.stdout.write = this.originalStdoutWrite;
        this.isActive = false;
        
        logger.info('Global error suppressor restored');
    }
}