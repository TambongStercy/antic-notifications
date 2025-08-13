import Joi from 'joi';

// Notification schemas
export const notificationRequestSchema = Joi.object({
    recipient: Joi.string().required().min(1).max(100).trim(),
    message: Joi.string().required().min(1).max(4096),
    type: Joi.string().valid('text', 'media').optional(),
    metadata: Joi.object().optional(),
});

export const whatsappNotificationSchema = notificationRequestSchema.keys({
    recipient: Joi.string().required().pattern(/^\+?[\d\s\-\(\)]+$/).messages({
        'string.pattern.base': 'WhatsApp recipient must be a valid phone number'
    }),
});

export const telegramNotificationSchema = notificationRequestSchema.keys({
    recipient: Joi.alternatives().try(
        Joi.string().pattern(/^\+?[1-9]\d{1,14}$/), // phone number E.164
        Joi.string().pattern(/^@[a-zA-Z0-9_]{5,32}$/),
        Joi.string().pattern(/^\d+$/)
    ).required().messages({
        'alternatives.match': 'Telegram recipient must be a phone number, chat ID (number) or @username'
    }),
});

// Admin schemas
export const adminLoginSchema = Joi.object({
    username: Joi.string().required().min(3).max(50).trim().alphanum(),
    password: Joi.string().required().min(6),
});

export const telegramTokenSchema = Joi.object({
    botToken: Joi.string().required().pattern(/^\d{8,10}:[A-Za-z0-9_-]{35}$/).messages({
        'string.pattern.base': 'Invalid Telegram bot token format'
    }),
});

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(6),
});

// Query parameter schemas
export const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('timestamp', 'status', 'service', 'recipient').default('timestamp'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const messageFiltersSchema = Joi.object({
    service: Joi.string().valid('whatsapp', 'telegram').optional(),
    status: Joi.string().valid('pending', 'sent', 'failed').optional(),
    recipient: Joi.string().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
    search: Joi.string().min(1).max(100).optional(),
}).concat(paginationSchema);

// Media upload schemas
export const mediaUploadSchema = Joi.object({
    recipient: Joi.string().required(),
    caption: Joi.string().max(1024).optional(),
    metadata: Joi.object().optional(),
});

// API Key schemas
export const createApiKeySchema = Joi.object({
    name: Joi.string().required().min(1).max(100).messages({
        'string.empty': 'API key name is required',
        'string.min': 'API key name must be at least 1 character',
        'string.max': 'API key name must not exceed 100 characters',
        'any.required': 'API key name is required'
    }),
    permissions: Joi.array().items(
        Joi.string().valid('whatsapp:send', 'telegram:send', 'messages:read', 'status:read')
    ).min(1).required().messages({
        'array.min': 'At least one permission is required',
        'any.required': 'Permissions are required',
        'any.only': 'Invalid permission specified'
    }),
    rateLimit: Joi.object({
        requests: Joi.number().integer().min(1).max(10000).default(100),
        windowMs: Joi.number().integer().min(60000).max(86400000).default(3600000)
    }).optional(),
    expiresAt: Joi.date().greater('now').optional().allow(null)
});

export const updateApiKeySchema = Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    permissions: Joi.array().items(
        Joi.string().valid('whatsapp:send', 'telegram:send', 'messages:read', 'status:read')
    ).min(1).optional(),
    isActive: Joi.boolean().optional(),
    rateLimit: Joi.object({
        requests: Joi.number().integer().min(1).max(10000),
        windowMs: Joi.number().integer().min(60000).max(86400000)
    }).optional(),
    expiresAt: Joi.date().greater('now').optional().allow(null)
});

export default {
    notificationRequestSchema,
    whatsappNotificationSchema,
    telegramNotificationSchema,
    adminLoginSchema,
    telegramTokenSchema,
    refreshTokenSchema,
    changePasswordSchema,
    paginationSchema,
    messageFiltersSchema,
    mediaUploadSchema,
    createApiKeySchema,
    updateApiKeySchema,
};
