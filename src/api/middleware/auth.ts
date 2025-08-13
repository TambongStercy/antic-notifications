import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { JWTPayload } from '@/types';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.substring(7) : null;
    if (!token) {
        return res.status(401).json({
            error: { code: 'unauthorized', message: 'Missing Bearer token' },
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
        });
    }

    try {
        const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
        (req as any).user = payload;
        next();
    } catch {
        return res.status(401).json({
            error: { code: 'unauthorized', message: 'Invalid token' },
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
        });
    }
}

export default authMiddleware;


