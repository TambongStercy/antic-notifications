import { Request, Response, NextFunction } from 'express';
import { apiKeyAuth } from '@/api/middleware/apiKey';
import { authMiddleware } from '@/api/middleware/auth';

// Simple in-memory rate limit store for admin tokens (use Redis in production)
const adminRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Fixed limit requested: 50 requests per hour for admin tokens
const ADMIN_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ADMIN_RATE_LIMIT_MAX = 50;

/**
 * Middleware that authenticates using either X-API-Key with optional permission
 * or an admin Bearer token. When using the admin token, enforce a 50/hour rate limit
 * per admin user.
 */
export const apiKeyOrAdminAuth = (requiredPermission?: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const hasApiKey = !!req.headers['x-api-key'];

        if (hasApiKey) {
            // Delegate to existing API key middleware (includes its own rate limiting)
            return apiKeyAuth(requiredPermission)(req as any, res, next);
        }

        // Fallback to admin token authentication
        authMiddleware(req, res, () => {
            const user = (req as any).user as { userId?: string; username?: string } | undefined;
            if (!user) {
                return res.status(401).json({
                    error: { code: 'unauthorized', message: 'Invalid token' },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                });
            }

            const rateKey = user.userId || user.username || 'admin';
            const now = Date.now();
            let entry = adminRateLimitStore.get(rateKey);

            if (!entry || now > entry.resetTime) {
                entry = { count: 0, resetTime: now + ADMIN_RATE_LIMIT_WINDOW_MS };
            }

            entry.count += 1;
            adminRateLimitStore.set(rateKey, entry);

            if (entry.count > ADMIN_RATE_LIMIT_MAX) {
                res.set({
                    'X-RateLimit-Limit': ADMIN_RATE_LIMIT_MAX.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
                });

                return res.status(429).json({
                    error: {
                        code: 'rate_limit_exceeded',
                        message: `Admin rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                });
            }

            // Set rate limit headers for visibility and propagate requester identity
            res.set({
                'X-RateLimit-Limit': ADMIN_RATE_LIMIT_MAX.toString(),
                'X-RateLimit-Remaining': (ADMIN_RATE_LIMIT_MAX - entry.count).toString(),
                'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
            });
            (req as any).requestedBy = `admin:${user.userId || user.username || 'unknown'}`;

            next();
        });
    };
};

export default apiKeyOrAdminAuth;


