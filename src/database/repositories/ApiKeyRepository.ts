import { ApiKey, IApiKey } from '@/database/models/ApiKey';
import { BaseRepository } from './BaseRepository';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface CreateApiKeyData {
    name: string;
    permissions: string[];
    rateLimit?: {
        requests: number;
        windowMs: number;
    };
    expiresAt?: Date;
}

export interface UpdateApiKeyData {
    name?: string;
    permissions?: string[];
    isActive?: boolean;
    rateLimit?: {
        requests: number;
        windowMs: number;
    };
    expiresAt?: Date;
}

export class ApiKeyRepository extends BaseRepository<IApiKey> {
    constructor() {
        super(ApiKey);
    }

    async createApiKey(data: CreateApiKeyData): Promise<{ apiKey: IApiKey; plainKey: string }> {
        // Generate a secure API key
        const plainKey = this.generateApiKey();
        const keyHash = await bcrypt.hash(plainKey, 12);

        const apiKey = await this.create({
            name: data.name,
            key: plainKey.substring(0, 8) + '...', // Store partial key for display
            keyHash,
            permissions: data.permissions,
            rateLimit: data.rateLimit || {
                requests: 100,
                windowMs: 3600000 // 1 hour
            },
            expiresAt: data.expiresAt
        });

        return { apiKey, plainKey };
    }

    async findByKey(key: string): Promise<IApiKey | null> {
        // First find all active API keys
        const apiKeys = await this.model.find({ 
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });

        // Check each key hash
        for (const apiKey of apiKeys) {
            const isValid = await bcrypt.compare(key, apiKey.keyHash);
            if (isValid) {
                return apiKey;
            }
        }

        return null;
    }

    async updateUsage(apiKeyId: string): Promise<void> {
        await this.model.findByIdAndUpdate(apiKeyId, {
            $inc: { usageCount: 1 },
            lastUsed: new Date()
        });
    }

    async updateApiKey(id: string, data: UpdateApiKeyData): Promise<IApiKey | null> {
        return await this.model.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true }
        );
    }

    async getActiveApiKeys(): Promise<IApiKey[]> {
        return await this.model.find({ 
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        }).sort({ createdAt: -1 });
    }

    async getAllApiKeys(): Promise<IApiKey[]> {
        return await this.model.find({}).sort({ createdAt: -1 });
    }

    async deactivateApiKey(id: string): Promise<IApiKey | null> {
        return await this.updateApiKey(id, { isActive: false });
    }

    async deleteApiKey(id: string): Promise<boolean> {
        const result = await this.model.findByIdAndDelete(id);
        return !!result;
    }

    private generateApiKey(): string {
        // Generate a secure 32-character API key
        const prefix = 'ak_'; // API Key prefix
        const randomBytes = crypto.randomBytes(16).toString('hex');
        return `${prefix}${randomBytes}`;
    }

    async getUsageStats(): Promise<{
        totalKeys: number;
        activeKeys: number;
        totalUsage: number;
        recentUsage: number;
    }> {
        const [totalKeys, activeKeys, usageStats] = await Promise.all([
            this.model.countDocuments({}),
            this.model.countDocuments({ isActive: true }),
            this.model.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsage: { $sum: '$usageCount' },
                        recentUsage: {
                            $sum: {
                                $cond: [
                                    {
                                        $gte: ['$lastUsed', new Date(Date.now() - 24 * 60 * 60 * 1000)]
                                    },
                                    '$usageCount',
                                    0
                                ]
                            }
                        }
                    }
                }
            ])
        ]);

        const stats = usageStats[0] || { totalUsage: 0, recentUsage: 0 };

        return {
            totalKeys,
            activeKeys,
            totalUsage: stats.totalUsage,
            recentUsage: stats.recentUsage
        };
    }
}

export default ApiKeyRepository;