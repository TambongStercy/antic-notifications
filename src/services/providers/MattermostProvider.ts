import { INotificationProvider, SendResult } from './INotificationProvider';
import { ServiceType } from '@/types';
import { validateMattermostChannelId, sanitizePhoneNumber } from '@/utils/phoneNumber';
import logger from '@/utils/logger';
import axios, { AxiosError } from 'axios';

export interface MattermostConfig {
    serverUrl: string;
    accessToken: string;
    defaultChannelId?: string;
}

export interface MattermostChannelInfo {
    id: string;
    name: string;
    display_name: string;
    type: 'O' | 'P' | 'D' | 'G'; // Open, Private, Direct, Group
}

export class MattermostProvider implements INotificationProvider {
    private config: MattermostConfig | null = null;
    private isConnected: boolean = false;
    private axios = axios.create();

    constructor() {
        // Set default timeout
        this.axios.defaults.timeout = 30000;
    }

    getServiceType(): ServiceType {
        return 'mattermost';
    }

    async initialize(config?: MattermostConfig): Promise<void> {
        try {
            if (!config) {
                logger.info('Mattermost provider initialized without configuration');
                return;
            }

            // Validate configuration
            if (!config.serverUrl || !config.accessToken) {
                throw new Error('Mattermost server URL and access token are required');
            }

            // Ensure serverUrl ends without trailing slash
            config.serverUrl = config.serverUrl.replace(/\/$/, '');

            this.config = config;

            // Configure axios with base URL and auth
            this.axios.defaults.baseURL = `${config.serverUrl}/api/v4`;
            this.axios.defaults.headers.common['Authorization'] = `Bearer ${config.accessToken}`;
            this.axios.defaults.headers.common['Content-Type'] = 'application/json';

            // Test connection by getting user info
            await this.testConnection();

            this.isConnected = true;
            logger.info('Mattermost provider initialized successfully');
        } catch (error) {
            this.isConnected = false;
            logger.error('Failed to initialize Mattermost provider:', error);
            throw error;
        }
    }

    async connect(): Promise<boolean> {
        try {
            if (!this.config) {
                throw new Error('Mattermost not configured. Please set server URL and access token first.');
            }

            await this.testConnection();
            this.isConnected = true;
            logger.info('Mattermost provider connected successfully');
            return true;
        } catch (error) {
            this.isConnected = false;
            logger.error('Failed to connect to Mattermost:', error);
            return false;
        }
    }

    async disconnect(): Promise<void> {
        try {
            this.isConnected = false;
            this.config = null;
            delete this.axios.defaults.headers.common['Authorization'];
            logger.info('Mattermost provider disconnected');
        } catch (error) {
            logger.error('Error disconnecting Mattermost provider:', error);
        }
    }

    isServiceConnected(): boolean {
        return this.isConnected;
    }

    async sendText(recipient: string, message: string, metadata?: Record<string, any>): Promise<SendResult> {
        try {
            // Input validation
            if (!recipient || typeof recipient !== 'string') {
                return { success: false, errorMessage: 'Channel ID is required' };
            }

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                return { success: false, errorMessage: 'Message content is required' };
            }

            if (!this.isConnected || !this.config) {
                return { success: false, errorMessage: 'Mattermost not connected. Please configure and connect first.' };
            }

            // Validate channel ID format
            const channelValidation = validateMattermostChannelId(recipient);
            if (!channelValidation.isValid) {
                return { success: false, errorMessage: channelValidation.error || 'Invalid channel ID format' };
            }

            const sanitizedChannelId = channelValidation.channelId!;

            logger.info(`Sending Mattermost message to channel: ${sanitizedChannelId}`);

            // Prepare the message payload
            const payload = {
                channel_id: sanitizedChannelId,
                message: message.trim(),
                props: metadata || {}
            };

            // Send message via REST API
            const response = await this.axios.post('/posts', payload);

            if (response.status === 201 && response.data) {
                logger.info(`Mattermost message sent successfully. Post ID: ${response.data.id}`);
                return {
                    success: true,
                    messageId: response.data.id,
                    metadata: {
                        channelId: sanitizedChannelId,
                        postId: response.data.id,
                        createAt: response.data.create_at
                    }
                };
            } else {
                return { success: false, errorMessage: 'Unexpected response from Mattermost server' };
            }
        } catch (error) {
            return this.handleMattermostError(error, 'send message');
        }
    }

    async sendMedia(recipient: string, mediaPath: string, caption?: string, metadata?: Record<string, any>): Promise<SendResult> {
        // For now, return not implemented. File uploads require more complex implementation
        return {
            success: false,
            errorMessage: 'Media sending not yet implemented for Mattermost. Use sendText for now.'
        };
    }

    /**
     * Test connection to Mattermost server
     */
    private async testConnection(): Promise<void> {
        try {
            const response = await this.axios.get('/users/me');
            if (response.status !== 200) {
                throw new Error(`Authentication failed. Status: ${response.status}`);
            }
            logger.info(`Authenticated as Mattermost user: ${response.data.username}`);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                if (axiosError.response?.status === 401) {
                    throw new Error('Invalid access token. Please check your Mattermost personal access token.');
                } else if (axiosError.response?.status === 403) {
                    throw new Error('Access denied. Please ensure the access token has sufficient permissions.');
                } else if (axiosError.code === 'ECONNREFUSED') {
                    throw new Error('Cannot connect to Mattermost server. Please check the server URL.');
                }
            }
            throw error;
        }
    }

    /**
     * Get channel information by ID
     */
    async getChannelInfo(channelId: string): Promise<MattermostChannelInfo | null> {
        try {
            if (!this.isConnected || !this.config) {
                return null;
            }

            const response = await this.axios.get(`/channels/${channelId}`);
            if (response.status === 200 && response.data) {
                return {
                    id: response.data.id,
                    name: response.data.name,
                    display_name: response.data.display_name,
                    type: response.data.type
                };
            }
            return null;
        } catch (error) {
            logger.error(`Error getting channel info for ${channelId}:`, error);
            return null;
        }
    }

    /**
     * Get list of channels the bot can access
     */
    async getAvailableChannels(): Promise<MattermostChannelInfo[]> {
        try {
            if (!this.isConnected || !this.config) {
                return [];
            }

            // Get current user's teams
            const teamsResponse = await this.axios.get('/users/me/teams');
            if (teamsResponse.status !== 200 || !teamsResponse.data.length) {
                return [];
            }

            const channels: MattermostChannelInfo[] = [];

            // Get channels for each team
            for (const team of teamsResponse.data) {
                try {
                    const channelsResponse = await this.axios.get(`/users/me/teams/${team.id}/channels`);
                    if (channelsResponse.status === 200 && channelsResponse.data) {
                        const teamChannels = channelsResponse.data.map((ch: any) => ({
                            id: ch.id,
                            name: ch.name,
                            display_name: ch.display_name,
                            type: ch.type
                        }));
                        channels.push(...teamChannels);
                    }
                } catch (error) {
                    logger.warn(`Error getting channels for team ${team.name}:`, error);
                }
            }

            return channels;
        } catch (error) {
            logger.error('Error getting available channels:', error);
            return [];
        }
    }

    /**
     * Handle Mattermost API errors
     */
    private handleMattermostError(error: any, operation: string): SendResult {
        logger.error(`Mattermost ${operation} error:`, error);

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.response?.status === 401) {
                return { success: false, errorMessage: 'Authentication failed. Please check your access token.' };
            } else if (axiosError.response?.status === 403) {
                return { success: false, errorMessage: 'Access denied. Bot may not have permission to post in this channel.' };
            } else if (axiosError.response?.status === 404) {
                return { success: false, errorMessage: 'Channel not found. Please check the channel ID.' };
            } else if (axiosError.response?.status === 400) {
                const errorMsg = (axiosError.response.data as any)?.message || 'Invalid request format';
                return { success: false, errorMessage: `Bad request: ${errorMsg}` };
            } else if (axiosError.code === 'ECONNREFUSED') {
                return { success: false, errorMessage: 'Cannot connect to Mattermost server. Please check server URL.' };
            } else if (axiosError.code === 'ECONNABORTED') {
                return { success: false, errorMessage: 'Request timeout. Mattermost server may be slow or unreachable.' };
            }

            return {
                success: false,
                errorMessage: `Mattermost API error: ${axiosError.response?.status || 'Network error'}`
            };
        }

        return {
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown Mattermost error'
        };
    }
}

export default MattermostProvider;
