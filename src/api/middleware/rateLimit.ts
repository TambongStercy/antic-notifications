import rateLimit from 'express-rate-limit';
import { config } from '@/config/environment';

export const apiRateLimiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
});

export default apiRateLimiter;


