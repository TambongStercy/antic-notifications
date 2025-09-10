import axios, { AxiosResponse } from 'axios'
import toast from 'react-hot-toast'
import type {
    AuthTokens,
    ServiceStatus,
    Message,
    MessageStats,
    HealthResponse,
    PaginatedResponse,
    NotificationRequest
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status
        const errData = error?.response?.data
        const code = errData?.error?.code as string | undefined

        // Show clear banner/toast for rate limits
        if (status === 429) {
            const message = errData?.error?.message || 'Rate limit exceeded'
            const resetEpoch = parseInt(error.response?.headers?.['x-ratelimit-reset'] || '0', 10)
            const nowEpoch = Math.floor(Date.now() / 1000)
            const seconds = resetEpoch > nowEpoch ? resetEpoch - nowEpoch : undefined
            toast.error(seconds ? `${message}. Try again in ${seconds}s.` : message)
            throw error
        }

        if (status === 401) {
            // Do not logout for login attempts
            if (error.config?.url?.includes('/api/admin/login')) {
                throw error
            }

            // Do not logout for API key-related 401s
            const apiKeyCodes = new Set([
                'missing_api_key',
                'invalid_api_key',
                'invalid_api_key_format',
                'api_key_disabled',
                'api_key_expired',
                'insufficient_permissions',
            ])

            if (code && apiKeyCodes.has(code)) {
                toast.error(errData?.error?.message || 'API key authentication failed')
                throw error
            }

            // Token expired or invalid → logout
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            window.location.href = '/login'
            throw error
        }

        if (errData?.error?.message) {
            toast.error(errData.error.message)
        } else {
            toast.error('An error occurred')
        }
        throw error
    }
)

// Auth APIs
export const authAPI = {
    login: async (username: string, password: string): Promise<AuthTokens> => {
        const response: AxiosResponse<AuthTokens> = await api.post('/api/admin/login', {
            username,
            password,
        })
        return response.data
    },

    logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
    },
}

// Health API
export const healthAPI = {
    getHealth: async (): Promise<HealthResponse> => {
        try {
            const response: AxiosResponse<HealthResponse> = await api.get('/api/health')
            return response.data
        } catch (error: any) {
            // Handle 503 Service Unavailable - still contains valid health data
            if (error.response && error.response.status === 503 && error.response.data) {
                return error.response.data
            }
            throw error
        }
    },
}

// Services API
export const servicesAPI = {
    getStatus: async (): Promise<ServiceStatus[]> => {
        const response: AxiosResponse<ServiceStatus[]> = await api.get('/api/admin/status')
        return response.data
    },

    getWhatsAppQR: async (): Promise<{ qrCode: string }> => {
        const response: AxiosResponse<{ qrCode: string }> = await api.get('/api/admin/qr')
        return response.data
    },

    setTelegramToken: async (botToken: string): Promise<void> => {
        await api.post('/api/admin/telegram/token', { botToken })
    },

    connectWhatsApp: async (): Promise<void> => {
        await api.post('/api/admin/whatsapp/connect')
    },

    disconnectWhatsApp: async (): Promise<void> => {
        await api.post('/api/admin/whatsapp/disconnect')
    },

    connectTelegram: async (): Promise<any> => {
        const response = await api.post('/api/admin/telegram/connect')
        return response.data
    },

    disconnectTelegram: async (): Promise<void> => {
        await api.post('/api/admin/telegram/disconnect')
    },

    handleWhatsAppStreamError: async (): Promise<void> => {
        await api.post('/api/admin/whatsapp/handle-stream-error')
    },

    stopWhatsAppReconnection: async (): Promise<void> => {
        await api.post('/api/admin/whatsapp/stop-reconnection')
    },

    getWhatsAppRealTimeStatus: async (): Promise<any> => {
        const response = await api.get('/api/admin/whatsapp/realtime-status')
        return response.data
    },

    setTelegramCredentials: async (credentials: { phoneNumber: string }): Promise<void> => {
        await api.post('/api/admin/telegram/credentials', credentials)
    },

    provideTelegramCode: async (code: string): Promise<void> => {
        await api.post('/api/admin/telegram/provide-code', { code })
    },

    provideTelegramPassword: async (password: string): Promise<void> => {
        await api.post('/api/admin/telegram/provide-password', { password })
    },

    // Mattermost API methods
    setMattermostConfig: async (serverUrl: string, accessToken: string): Promise<void> => {
        await api.post('/api/admin/mattermost/config', { serverUrl, accessToken })
    },

    connectMattermost: async (): Promise<void> => {
        await api.post('/api/admin/mattermost/connect')
    },

    disconnectMattermost: async (): Promise<void> => {
        await api.post('/api/admin/mattermost/disconnect')
    },

    getMattermostStatus: async (): Promise<{
        configured: boolean
        connected: boolean
        serverUrl: string | null
        hasAccessToken: boolean
        needsSetup?: boolean
        timestamp: string
        lastUpdated?: string
    }> => {
        const response = await api.get('/api/admin/mattermost/status')
        return response.data
    },

    clearMattermostConfig: async (): Promise<void> => {
        await api.delete('/api/admin/mattermost/config')
    },
}

// Messages API
export const messagesAPI = {
    getMessages: async (params: {
        page?: number
        limit?: number
        service?: string
        status?: string
        recipient?: string
    }): Promise<PaginatedResponse<Message>> => {
        const response: AxiosResponse<PaginatedResponse<Message>> = await api.get('/api/messages', {
            params,
        })
        return response.data
    },

    getStats: async (): Promise<MessageStats> => {
        const response: AxiosResponse<MessageStats> = await api.get('/api/messages/stats')
        return response.data
    },

    retryMessage: async (messageId: string): Promise<void> => {
        await api.post(`/api/messages/${messageId}/retry`)
    },

    sendWhatsApp: async (data: NotificationRequest): Promise<{ messageId: string }> => {
        const response: AxiosResponse<{ messageId: string }> = await api.post('/api/notifications/whatsapp', data)
        return response.data
    },

    sendTelegram: async (data: NotificationRequest): Promise<{ messageId: string }> => {
        const response: AxiosResponse<{ messageId: string }> = await api.post('/api/notifications/telegram', data)
        return response.data
    },

    sendMattermost: async (data: NotificationRequest): Promise<{ messageId: string }> => {
        const response: AxiosResponse<{ messageId: string }> = await api.post('/api/notifications/mattermost', data)
        return response.data
    },
}

// API Keys analytics
export const apiKeysAnalyticsAPI = {
    getUsageSeries: async (params: { from: string; to: string; mode: 'month' | 'week' | 'rolling4x7'; keyId?: string }) => {
        const response = await api.get('/api/admin/api-keys/usage-series', { params })
        return response.data.data as Array<{ keyId: string; period: string; count: number }>
    }
}

export default api
