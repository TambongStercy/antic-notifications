/**
 * Phone number sanitization and validation utilities
 */

export interface PhoneValidationResult {
    isValid: boolean;
    cleanNumber: string;
    error?: string;
    formatted?: string;
}

export interface MattermostChannelValidationResult {
    isValid: boolean;
    channelId?: string;
    error?: string;
}

/**
 * Sanitize phone number by removing all non-digit characters and spaces
 * @param phoneNumber - Raw phone number string
 * @returns Sanitized phone number
 */
export function sanitizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return '';
    }
    
    // Remove all spaces, dashes, parentheses, and non-digit characters except +
    return phoneNumber.replace(/[\s\-\(\)\[\]\.]/g, '').replace(/[^\d\+]/g, '');
}

/**
 * Validate phone number for WhatsApp
 * @param phoneNumber - Raw phone number string
 * @returns Validation result with clean number
 */
export function validateWhatsAppPhoneNumber(phoneNumber: string): PhoneValidationResult {
    const sanitized = sanitizePhoneNumber(phoneNumber);
    
    if (!sanitized) {
        return {
            isValid: false,
            cleanNumber: '',
            error: 'Phone number is required'
        };
    }
    
    // Remove leading + if present
    const cleanNumber = sanitized.replace(/^\+/, '');
    
    // Check minimum length (international format should be at least 10 digits)
    if (cleanNumber.length < 10) {
        return {
            isValid: false,
            cleanNumber,
            error: 'Phone number must be at least 10 digits long'
        };
    }
    
    // Check maximum length (most international numbers are 15 digits max)
    if (cleanNumber.length > 15) {
        return {
            isValid: false,
            cleanNumber,
            error: 'Phone number must be no more than 15 digits long'
        };
    }
    
    // Check if it starts with valid international prefix
    if (!cleanNumber.match(/^[1-9]/)) {
        return {
            isValid: false,
            cleanNumber,
            error: 'Phone number must start with a valid country code (1-9)'
        };
    }
    
    return {
        isValid: true,
        cleanNumber,
        formatted: `+${cleanNumber}`
    };
}

/**
 * Validate phone number for Telegram
 * @param phoneNumber - Raw phone number string
 * @returns Validation result with clean number
 */
export function validateTelegramPhoneNumber(phoneNumber: string): PhoneValidationResult {
    // For Telegram, we support chat IDs (numbers), usernames (@username), and phone numbers
    
    // Check if it's a username (starts with @)
    if (phoneNumber.startsWith('@')) {
        if (phoneNumber.length < 6) {
            return {
                isValid: false,
                cleanNumber: phoneNumber,
                error: 'Telegram username must be at least 5 characters long'
            };
        }
        return {
            isValid: true,
            cleanNumber: phoneNumber,
            formatted: phoneNumber
        };
    }
    
    // Check if it's a numeric chat ID
    const numericId = phoneNumber.replace(/\D/g, '');
    if (numericId && numericId === phoneNumber.replace(/[\s\-\+]/g, '')) {
        return {
            isValid: true,
            cleanNumber: numericId,
            formatted: numericId
        };
    }
    
    // Otherwise, validate as phone number
    return validateWhatsAppPhoneNumber(phoneNumber);
}

/**
 * Format phone number for WhatsApp JID
 * @param phoneNumber - Clean phone number (digits only)
 * @returns WhatsApp JID format
 */
export function formatWhatsAppJID(phoneNumber: string): string {
    const validation = validateWhatsAppPhoneNumber(phoneNumber);
    if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid phone number');
    }
    return `${validation.cleanNumber}@s.whatsapp.net`;
}

/**
 * Validate Mattermost channel ID
 * @param channelId - Channel ID string (26 character alphanumeric)
 * @returns Validation result
 */
export function validateMattermostChannelId(channelId: string): MattermostChannelValidationResult {
    if (!channelId || typeof channelId !== 'string') {
        return {
            isValid: false,
            error: 'Channel ID is required'
        };
    }
    
    const sanitized = channelId.trim();
    
    if (!sanitized) {
        return {
            isValid: false,
            error: 'Channel ID cannot be empty'
        };
    }
    
    // Mattermost channel IDs are typically 26 characters long, alphanumeric
    if (!/^[a-zA-Z0-9]{26}$/.test(sanitized)) {
        return {
            isValid: false,
            error: 'Invalid channel ID format. Must be 26 alphanumeric characters.'
        };
    }
    
    return {
        isValid: true,
        channelId: sanitized
    };
}