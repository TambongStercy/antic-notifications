import { Request, Response, NextFunction } from 'express';
import NotificationService from '@/services/NotificationService';
import { version } from '@/version';

export class HealthController {
    constructor(private service: NotificationService) { }

    getHealth = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const health = await this.service.health(version);
            const status = health.status === 'healthy' ? 200 : 503;
            res.status(status).json(health);
        } catch (err) { next(err); }
    };
}

export default HealthController;


