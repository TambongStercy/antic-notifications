import Joi from 'joi';
import { sanitizePhoneNumber, validateWhatsAppPhoneNumber, validateTelegramPhoneNumber } from '@/utils/phoneNumber';

// Custom Joi validators
const whatsappRecipientValidator = Joi.string().custom((value, helpers) => {
    const validation = validateWhatsAppPhoneNumber(value);
    if (!validation.isValid) {
        return helpers.error('whatsapp.invalid', { message: validation.error });
    }
    // Return sanitized value
    return validation.formatted || validation.cleanNumber;
}).messages({
    'whatsapp.invalid': '{{#message}}'
});

const telegramRecipientValidator = Joi.string().custom((value, helpers) => {
    const validation = validateTelegramPhoneNumber(value);
    if (!validation.isValid) {
        return helpers.error('telegram.invalid', { message: validation.error });
    }
    // Return sanitized value
    return validation.formatted || validation.cleanNumber;
}).messages({
    'telegram.invalid': '{{#message}}'
});

// Notification schemas
export const notificationRequestSchema = Joi.object({
    recipient: Joi.string().required().min(1).max(100).trim(),
    message: Joi.string().required().min(1).trim().messages({
        'string.empty': 'Message content is required',
        'string.min': 'Message must not be empty',
        'any.required': 'Message is required'
    }),
    type: Joi.string().valid('text', 'media').optional(),
    metadata: Joi.object().optional(),
});

export const whatsappNotificationSchema = notificationRequestSchema.keys({
    recipient: whatsappRecipientValidator.required(),
    message: Joi.string().required().min(1).max(65000).trim().messages({
        'string.max': 'WhatsApp message cannot exceed 65,000 characters',
        'string.empty': 'Message content is required',
        'any.required': 'Message is required'
    }),
});

export const telegramNotificationSchema = notificationRequestSchema.keys({
    recipient: telegramRecipientValidator.required(),
    message: Joi.string().required().min(1).max(4096).trim().messages({
        'string.max': 'Telegram message cannot exceed 4,096 characters',
        'string.empty': 'Message content is required',
        'any.required': 'Message is required'
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
