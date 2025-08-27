import rateLimit from 'express-rate-limit';
import { config } from '@/config/environment';

// General API rate limiter (for public endpoints)
export const apiRateLimiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: 'rate_limit_exceeded',
            message: 'Too many requests, please try again later.'
        }
    }
});

// More lenient rate limiter for admin endpoints (authenticated users)
export const adminRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute window
    max: 300, // 300 requests per minute (5 per second average)
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: 'admin_rate_limit_exceeded',
            message: 'Too many admin requests, please slow down.'
        }
    },
    // Skip rate limiting for status endpoint to allow polling
    skip: (req) => {
        return req.path === '/api/admin/status';
    }
});

export default apiRateLimiter;


