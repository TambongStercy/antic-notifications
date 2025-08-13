import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    const status = err.status || 500;
    const code = err.code || 'internal_error';
    const message = err.message || 'Internal server error';
    const details = err.details;

    logger.error('Request failed', {
        method: req.method,
        path: req.originalUrl,
        status,
        code,
        message,
        details,
    });

    res.status(status).json({
        error: { code, message, details },
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    });
}

export default errorHandler;


