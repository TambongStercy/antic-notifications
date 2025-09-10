import { Request, Response, NextFunction } from 'express';
import { ApiKeyRepository } from '@/database/repositories/ApiKeyRepository';
import { config } from '@/config/environment';
import logger from '@/utils/logger';

type AuthenticatedRequest = Request & {
    apiKey?: {
        id: string;
        name: string;
        permissions: string[];
        rateLimit: {
            requests: number;
            windowMs: number;
        };
    };
};

const apiKeyRepo = new ApiKeyRepository();

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const apiKeyAuth = (requiredPermission?: string, allowSameOrigin: boolean = false) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const apiKey = req.headers['x-api-key'] as string;
            
            // Same-origin exemption (ONLY if explicitly enabled and from trusted origin)
            if (allowSameOrigin && !apiKey) {
                const origin = req.headers.origin;
                const referer = req.headers.referer;
                const trustedOrigins = [config.cors.origin];
                
                // Check if request is from trusted origin (admin dashboard)
                const isFromTrustedOrigin = trustedOrigins.some(trustedOrigin => 
                    origin === trustedOrigin || referer?.startsWith(trustedOrigin + '/')
                );
                
                if (isFromTrustedOrigin) {
                    // Create a virtual API key for same-origin requests with limited permissions
                    req.apiKey = {
                        id: 'same-origin',
                        name: 'Same-Origin Request (Admin Dashboard)',
                        permissions: ['messages:read', 'status:read'], // Limited permissions
                        rateLimit: { requests: 1000, windowMs: 3600000 } // Higher rate limit but still limited
                    };
                    (req as any).requestedBy = 'apiKey:same-origin';
                    
                    // Still check permissions
                    if (requiredPermission && !req.apiKey.permissions.includes(requiredPermission)) {
                        return res.status(403).json({
                            error: {
                                code: 'insufficient_permissions',
                                message: `Same-origin requests don't have permission: ${requiredPermission}. Use an API key instead.`
                            },
                            timestamp: new Date().toISOString(),
                            path: req.originalUrl
                        });
                    }
                    
                    logger.info('Same-origin request authenticated', {
                        origin,
                        referer,
                        path: req.originalUrl
                    });
                    
                    return next();
                }
            }

            if (!apiKey) {
                return res.status(401).json({
                    error: {
                        code: 'missing_api_key',
                        message: 'API key is required. Include it in the X-API-Key header.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            // Check for master API key from .env (no rate limiting, full permissions)
            if (config.security.masterApiKey && apiKey === config.security.masterApiKey) {
                req.apiKey = {
                    id: 'master',
                    name: 'Master API Key (.env)',
                    permissions: ['whatsapp:send', 'telegram:send', 'mattermost:send', 'messages:read', 'status:read'],
                    rateLimit: { requests: Infinity, windowMs: 0 }
                };
                (req as any).requestedBy = 'apiKey:master';
                
                logger.info('Master API key authenticated', {
                    path: req.originalUrl,
                    ip: req.ip
                });
                
                return next();
            }

            // Validate API key format for database keys
            if (!apiKey.startsWith('ak_') || apiKey.length !== 35) {
                return res.status(401).json({
                    error: {
                        code: 'invalid_api_key_format',
                        message: 'Invalid API key format.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            // Find and validate API key
            const keyRecord = await apiKeyRepo.findByKey(apiKey);

            if (!keyRecord) {
                logger.warn('Invalid API key attempt', {
                    key: apiKey.substring(0, 8) + '...',
                    ip: req.ip,
                    path: req.originalUrl
                });

                return res.status(401).json({
                    error: {
                        code: 'invalid_api_key',
                        message: 'Invalid or expired API key.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            // Check if API key is active
            if (!keyRecord.isActive) {
                return res.status(401).json({
                    error: {
                        code: 'api_key_disabled',
                        message: 'API key has been disabled.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            // Check expiration
            if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
                return res.status(401).json({
                    error: {
                        code: 'api_key_expired',
                        message: 'API key has expired.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            // Check permissions
            if (requiredPermission && !keyRecord.permissions.includes(requiredPermission)) {
                return res.status(403).json({
                    error: {
                        code: 'insufficient_permissions',
                        message: `API key does not have required permission: ${requiredPermission}`
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            // Rate limiting
            const rateLimitKey = keyRecord._id.toString();
            const now = Date.now();
            const windowMs = keyRecord.rateLimit.windowMs;
            const maxRequests = keyRecord.rateLimit.requests;

            let rateLimitData = rateLimitStore.get(rateLimitKey);

            if (!rateLimitData || now > rateLimitData.resetTime) {
                rateLimitData = {
                    count: 0,
                    resetTime: now + windowMs
                };
            }

            rateLimitData.count++;
            rateLimitStore.set(rateLimitKey, rateLimitData);

            if (rateLimitData.count > maxRequests) {
                const resetIn = Math.ceil((rateLimitData.resetTime - now) / 1000);

                res.set({
                    'X-RateLimit-Limit': maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': Math.ceil(rateLimitData.resetTime / 1000).toString()
                });

                return res.status(429).json({
                    error: {
                        code: 'rate_limit_exceeded',
                        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': maxRequests.toString(),
                'X-RateLimit-Remaining': (maxRequests - rateLimitData.count).toString(),
                'X-RateLimit-Reset': Math.ceil(rateLimitData.resetTime / 1000).toString()
            });

            // Update usage statistics
            await apiKeyRepo.updateUsage(keyRecord._id.toString());

            // Attach API key info to request
            req.apiKey = {
                id: keyRecord._id.toString(),
                name: keyRecord.name,
                permissions: keyRecord.permissions,
                rateLimit: keyRecord.rateLimit
            };

            // Propagate requester identity for downstream persistence
            (req as any).requestedBy = `apiKey:${keyRecord._id.toString()}`;

            logger.info('API key authenticated', {
                keyName: keyRecord.name,
                keyId: keyRecord._id.toString(),
                permission: requiredPermission,
                path: req.originalUrl
            });

            next();
        } catch (error) {
            logger.error('API key authentication error:', error);
            return res.status(500).json({
                error: {
                    code: 'authentication_error',
                    message: 'Internal authentication error.'
                },
                timestamp: new Date().toISOString(),
                path: req.originalUrl
            });
        }
    };
};

