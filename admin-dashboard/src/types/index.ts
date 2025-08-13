export interface User {
    id: string
    username: string
    role: string
}

export interface AuthTokens {
    accessToken: string
    refreshToken: string
}

export interface ServiceStatus {
    service: 'whatsapp' | 'telegram'
    status: 'connected' | 'disconnected' | 'authenticating' | 'not_configured'
    lastUpdated: string
    metadata?: {
        qrCode?: string
        botToken?: string
    }
}

export interface Message {
    id: string
    service: 'whatsapp' | 'telegram'
    recipient: string
    message: string
    status: 'pending' | 'sent' | 'failed'
    timestamp: string
    errorMessage?: string
    messageId?: string
    metadata?: Record<string, any>
}

export interface MessageStats {
    messageStats: Array<{
        service: 'whatsapp' | 'telegram'
        stats: Array<{
            status: 'pending' | 'sent' | 'failed'
            count: number
        }>
        total: number
    }>
    queueStats: {
        pendingMessages: number
        failedMessages: number
        retryableMessages: number
    }
}

export interface HealthResponse {
    status: 'healthy' | 'unhealthy'
    timestamp: string
    services: {
        database: 'connected' | 'disconnected'
        whatsapp: 'connected' | 'disconnected' | 'authenticating' | 'not_configured'
        telegram: 'connected' | 'disconnected' | 'not_configured'
    }
    uptime: number
    version: string
}

export interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        pages: number
    }
}

export interface NotificationRequest {
    recipient: string
    message: string
    metadata?: Record<string, any>
}

export interface WebSocketEvents {
    'qr-code': { service: string; qrCode: string }
    'service-status': { service: string; status: string }
    'message-status': { messageId: string; status: string }
}
