import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';

export class SessionCleanup {
    /**
     * Force cleanup of WhatsApp session files on Windows
     * This handles the EBUSY errors that occur when files are locked
     */
    static async forceCleanupSession(sessionPath: string): Promise<void> {
        logger.info('Starting force cleanup of session files', { sessionPath });

        try {
            if (!fs.existsSync(sessionPath)) {
                logger.info('Session path does not exist, nothing to clean');
                return;
            }

            // On Windows, we need to be more aggressive about cleanup
            if (process.platform === 'win32') {
                await this.windowsForceCleanup(sessionPath);
            } else {
                await this.standardCleanup(sessionPath);
            }

            logger.info('Session cleanup completed successfully');
        } catch (error) {
            logger.error('Error during session cleanup:', error);
            throw error;
        }
    }

    private static async windowsForceCleanup(sessionPath: string): Promise<void> {
        logger.info('Performing Windows-specific session cleanup');

        // First, try to kill any Chrome processes that might be holding files
        try {
            const { execSync } = require('child_process');
            execSync('taskkill /f /im chrome.exe /t', { stdio: 'ignore' });
            execSync('taskkill /f /im chromium.exe /t', { stdio: 'ignore' });
            logger.info('Killed Chrome processes');
        } catch (error) {
            // Ignore errors - processes might not be running
            logger.debug('No Chrome processes to kill or kill failed');
        }

        // Wait a bit for processes to fully terminate
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try multiple times to delete the directory
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            try {
                if (fs.existsSync(sessionPath)) {
                    // Use recursive force removal
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    logger.info(`Session directory removed on attempt ${attempts + 1}`);
                }
                break;
            } catch (error) {
                attempts++;
                logger.warn(`Cleanup attempt ${attempts} failed:`, error);

                if (attempts >= maxAttempts) {
                    // Last resort: try to rename the directory so it doesn't interfere
                    try {
                        const backupPath = `${sessionPath}_backup_${Date.now()}`;
                        fs.renameSync(sessionPath, backupPath);
                        logger.info('Could not delete session, renamed to backup');
                    } catch (renameError) {
                        logger.error('Could not even rename session directory:', renameError);
                        throw error;
                    }
                } else {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
            }
        }
    }

    private static async standardCleanup(sessionPath: string): Promise<void> {
        logger.info('Performing standard session cleanup');
        
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            logger.info('Session directory removed');
        }
    }

    /**
     * Check if session files are locked (Windows-specific issue)
     */
    static async isSessionLocked(sessionPath: string): Promise<boolean> {
        if (!fs.existsSync(sessionPath)) {
            return false;
        }

        try {
            // Try to create a test file in the session directory
            const testFile = path.join(sessionPath, 'test_lock_check.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            return false;
        } catch (error) {
            logger.warn('Session appears to be locked:', error);
            return true;
        }
    }

    /**
     * Safe session cleanup that handles locked files gracefully
     */
    static async safeCleanupSession(sessionPath: string): Promise<boolean> {
        try {
            const isLocked = await this.isSessionLocked(sessionPath);
            
            if (isLocked) {
                logger.warn('Session is locked, attempting force cleanup');
                await this.forceCleanupSession(sessionPath);
                return true;
            } else {
                await this.standardCleanup(sessionPath);
                return true;
            }
        } catch (error) {
            logger.error('Safe cleanup failed:', error);
            return false;
        }
    }
}