import { Request, Response, NextFunction } from 'express';
import NotificationService from '@/services/NotificationService';

export class NotificationsController {
    constructor(private service: NotificationService) { }

    sendWhatsApp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { recipient, message, metadata } = req.body;
            // Capture requester identity from middleware
            const requestedBy: string | undefined = (req as any).requestedBy;
            const result = await this.service.sendWhatsApp({ recipient, message, metadata: { ...(metadata || {}), requestedBy } });
            if (!result.success) {
                res.status(400).json({ error: { code: 'whatsapp_send_failed', message: result.error }, timestamp: new Date().toISOString(), path: req.originalUrl });
                return;
            }
            res.json({ messageId: result.messageId });
        } catch (err) { next(err); }
    };

    sendTelegram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { recipient, message, metadata } = req.body;
            const requestedBy: string | undefined = (req as any).requestedBy;

            // Use GramJS provider directly to support phone numbers as primary
            const { telegram } = this.service.getProviders();
            if (!telegram.isConnected()) {
                res.status(400).json({ error: { code: 'telegram_send_failed', message: 'Telegram not configured or connected' }, timestamp: new Date().toISOString(), path: req.originalUrl });
                return;
            }

            const sendResult = await telegram.sendText(recipient, message, { ...(metadata || {}), requestedBy });
            if (!sendResult.success) {
                res.status(400).json({ error: { code: 'telegram_send_failed', message: sendResult.errorMessage }, timestamp: new Date().toISOString(), path: req.originalUrl });
                return;
            }

            res.json({ messageId: sendResult.externalMessageId });
        } catch (err) { next(err); }
    };

    sendMattermost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { recipient, message, metadata } = req.body;
            const requestedBy: string | undefined = (req as any).requestedBy;

            // Get Mattermost provider
            const { mattermost } = this.service.getProviders();
            if (!mattermost.isServiceConnected()) {
                res.status(400).json({ 
                    error: { 
                        code: 'mattermost_send_failed', 
                        message: 'Mattermost not configured or connected' 
                    }, 
                    timestamp: new Date().toISOString(), 
                    path: req.originalUrl 
                });
                return;
            }

            let sendResult;
            
            // Check if recipient is an email address
            if (recipient.includes('@')) {
                // Send by email (will do user lookup and create DM channel)
                sendResult = await mattermost.sendTextByEmail(recipient, message, { 
                    ...(metadata || {}), 
                    requestedBy 
                });
            } else {
                // Send by channel ID
                sendResult = await mattermost.sendText(recipient, message, { 
                    ...(metadata || {}), 
                    requestedBy 
                });
            }

            if (!sendResult.success) {
                res.status(400).json({ 
                    error: { 
                        code: 'mattermost_send_failed', 
                        message: sendResult.errorMessage 
                    }, 
                    timestamp: new Date().toISOString(), 
                    path: req.originalUrl 
                });
                return;
            }

            res.json({ 
                messageId: sendResult.messageId,
                metadata: sendResult.metadata 
            });
        } catch (err) { 
            next(err); 
        }
    };
}

export default NotificationsController;


