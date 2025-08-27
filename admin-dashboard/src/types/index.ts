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
    service: 'whatsapp' | 'telegram' | 'mattermost'
    status: 'connected' | 'disconnected' | 'not_configured' | 'authenticating'
    lastUpdated: string
    metadata?: {
        qrCode?: string
        botToken?: string
        serverUrl?: string
        accessToken?: string
        hasAccessToken?: boolean
    }
}

export interface Message {
    id: string
    service: 'whatsapp' | 'telegram' | 'mattermost'
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
        service: 'whatsapp' | 'telegram' | 'mattermost'
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
        whatsapp: 'connected' | 'disconnected' | 'not_configured' | 'authenticating'
        telegram: 'connected' | 'disconnected' | 'not_configured' | 'authenticating'
        mattermost: 'connected' | 'disconnected' | 'not_configured' | 'authenticating'
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
