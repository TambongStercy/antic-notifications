import { Schema, model, Document } from 'mongoose';

export interface IApiKey extends Document {
    name: string;
    key: string;
    keyHash: string;
    permissions: string[];
    isActive: boolean;
    lastUsed?: Date;
    usageCount: number;
    rateLimit: {
        requests: number;
        windowMs: number;
    };
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}

const apiKeySchema = new Schema<IApiKey>({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    keyHash: {
        type: String,
        required: true,
        unique: true
    },
    permissions: [{
        type: String,
        enum: ['whatsapp:send', 'telegram:send', 'messages:read', 'status:read'],
        required: true
    }],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastUsed: {
        type: Date,
        default: null
    },
    usageCount: {
        type: Number,
        default: 0
    },
    rateLimit: {
        requests: {
            type: Number,
            default: 100,
            min: 1,
            max: 10000
        },
        windowMs: {
            type: Number,
            default: 3600000, // 1 hour
            min: 60000, // 1 minute
            max: 86400000 // 24 hours
        }
    },
    expiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient queries
apiKeySchema.index({ key: 1, isActive: 1 });
apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ApiKey = model<IApiKey>('ApiKey', apiKeySchema);