import { Request, Response, NextFunction } from 'express';
import { ApiKeyRepository } from '@/database/repositories/ApiKeyRepository';
import MessageRepository from '@/database/repositories/MessageRepository';
import logger from '@/utils/logger';

class ApiKeyController {
    private apiKeyRepo: ApiKeyRepository;
    private messageRepo: MessageRepository;

    constructor() {
        this.apiKeyRepo = new ApiKeyRepository();
        this.messageRepo = new MessageRepository();
    }

    createApiKey = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name, permissions, rateLimit, expiresAt } = req.body;

            const { apiKey, plainKey } = await this.apiKeyRepo.createApiKey({
                name,
                permissions,
                rateLimit,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined
            });

            logger.info('API key created', {
                keyId: apiKey._id,
                name: apiKey.name,
                permissions: apiKey.permissions
            });

            res.status(201).json({
                success: true,
                data: {
                    id: apiKey._id,
                    name: apiKey.name,
                    key: plainKey, // Only returned once!
                    permissions: apiKey.permissions,
                    rateLimit: apiKey.rateLimit,
                    isActive: apiKey.isActive,
                    expiresAt: apiKey.expiresAt,
                    createdAt: apiKey.createdAt
                },
                message: 'API key created successfully. Save the key securely - it will not be shown again.'
            });
        } catch (err) {
            next(err);
        }
    };

    getApiKeys = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const apiKeys = await this.apiKeyRepo.getAllApiKeys();

            res.json({
                success: true,
                data: apiKeys.map(key => ({
                    id: key._id,
                    name: key.name,
                    key: key.key, // Partial key for display
                    permissions: key.permissions,
                    rateLimit: key.rateLimit,
                    isActive: key.isActive,
                    lastUsed: key.lastUsed,
                    usageCount: key.usageCount,
                    expiresAt: key.expiresAt,
                    createdAt: key.createdAt,
                    updatedAt: key.updatedAt
                }))
            });
        } catch (err) {
            next(err);
        }
    };

    getApiKey = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const apiKey = await this.apiKeyRepo.findById(id);

            if (!apiKey) {
                return res.status(404).json({
                    error: {
                        code: 'api_key_not_found',
                        message: 'API key not found.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            res.json({
                success: true,
                data: {
                    id: apiKey._id,
                    name: apiKey.name,
                    key: apiKey.key,
                    permissions: apiKey.permissions,
                    rateLimit: apiKey.rateLimit,
                    isActive: apiKey.isActive,
                    lastUsed: apiKey.lastUsed,
                    usageCount: apiKey.usageCount,
                    expiresAt: apiKey.expiresAt,
                    createdAt: apiKey.createdAt,
                    updatedAt: apiKey.updatedAt
                }
            });
        } catch (err) {
            next(err);
        }
    };

    updateApiKey = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { name, permissions, isActive, rateLimit, expiresAt } = req.body;

            const updatedApiKey = await this.apiKeyRepo.updateApiKey(id, {
                name,
                permissions,
                isActive,
                rateLimit,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined
            });

            if (!updatedApiKey) {
                return res.status(404).json({
                    error: {
                        code: 'api_key_not_found',
                        message: 'API key not found.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            logger.info('API key updated', {
                keyId: updatedApiKey._id,
                name: updatedApiKey.name
            });

            res.json({
                success: true,
                data: {
                    id: updatedApiKey._id,
                    name: updatedApiKey.name,
                    key: updatedApiKey.key,
                    permissions: updatedApiKey.permissions,
                    rateLimit: updatedApiKey.rateLimit,
                    isActive: updatedApiKey.isActive,
                    lastUsed: updatedApiKey.lastUsed,
                    usageCount: updatedApiKey.usageCount,
                    expiresAt: updatedApiKey.expiresAt,
                    createdAt: updatedApiKey.createdAt,
                    updatedAt: updatedApiKey.updatedAt
                },
                message: 'API key updated successfully.'
            });
        } catch (err) {
            next(err);
        }
    };

    deleteApiKey = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const deleted = await this.apiKeyRepo.deleteApiKey(id);

            if (!deleted) {
                return res.status(404).json({
                    error: {
                        code: 'api_key_not_found',
                        message: 'API key not found.'
                    },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl
                });
            }

            logger.info('API key deleted', { keyId: id });

            res.json({
                success: true,
                message: 'API key deleted successfully.'
            });
        } catch (err) {
            next(err);
        }
    };

    getUsageStats = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const stats = await this.apiKeyRepo.getUsageStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (err) {
            next(err);
        }
    };

    getApiKeyUsageSeries = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { from, to, mode, keyId } = req.query as { from: string; to: string; mode: 'month' | 'week' | 'rolling4x7'; keyId?: string };
            const fromDate = new Date(from);
            const toDate = new Date(to);
            const bucket = mode === 'week' ? 'week' : mode === 'rolling4x7' ? 'rolling4x7' : 'month';
            const series = await this.messageRepo.getApiKeyUsageSeries({ from: fromDate, to: toDate, bucket, keyId });
            res.json({ success: true, data: series });
        } catch (err) {
            next(err);
        }
    };
}

export default ApiKeyController;