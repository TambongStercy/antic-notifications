import { INotificationProvider, SendResult } from './INotificationProvider';
import { ServiceType } from '@/types';
import { validateMattermostChannelId, sanitizePhoneNumber } from '@/utils/phoneNumber';
import { MessageRepository } from '@/database/repositories/MessageRepository';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
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
    private messageRepository: MessageRepository;
    private statusRepository: ServiceStatusRepository;

    constructor(deps?: { 
        messageRepository?: MessageRepository;
        statusRepository?: ServiceStatusRepository;
    }) {
        // Set default timeout
        this.axios.defaults.timeout = 180000; // 3 minutes
        this.messageRepository = deps?.messageRepository ?? new MessageRepository();
        this.statusRepository = deps?.statusRepository ?? new ServiceStatusRepository();
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

            // Save credentials to database for persistence
            await this.statusRepository.setMattermostCredentials(config);

            this.isConnected = true;
            logger.info('Mattermost provider initialized successfully');
        } catch (error) {
            this.isConnected = false;
            logger.error('Failed to initialize Mattermost provider:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
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
        // Input validation
        if (!recipient || typeof recipient !== 'string') {
            return { success: false, errorMessage: 'Channel ID is required' };
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return { success: false, errorMessage: 'Message content is required' };
        }

        // Validate channel ID format
        const channelValidation = validateMattermostChannelId(recipient);
        if (!channelValidation.isValid) {
            return { success: false, errorMessage: channelValidation.error || 'Invalid channel ID format' };
        }

        const sanitizedChannelId = channelValidation.channelId!;

        try {
            // Create message record in database
            const msg = await this.messageRepository.create({
                service: 'mattermost' as ServiceType,
                recipient: sanitizedChannelId,
                message: message.trim(),
                status: 'pending',
                timestamp: new Date(),
                metadata: metadata ?? {},
                requestedBy: (metadata && (metadata as any).requestedBy) || (global as any).__requestedBy || 'admin',
            } as any);

            // Connection validation
            if (!this.isConnected || !this.config) {
                await this.messageRepository.markAsFailed(msg.id, 'Mattermost not connected. Please configure and connect first.');
                return { success: false, errorMessage: 'Mattermost not connected. Please configure and connect first.' };
            }

            try {
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
                    const messageId = response.data.id;
                    await this.messageRepository.markAsSent(msg.id, messageId);
                    logger.info(`Mattermost message sent successfully. Post ID: ${messageId}`);
                    
                    return {
                        success: true,
                        messageId: messageId,
                        metadata: {
                            channelId: sanitizedChannelId,
                            postId: messageId,
                            createAt: response.data.create_at
                        }
                    };
                } else {
                    await this.messageRepository.markAsFailed(msg.id, 'Unexpected response from Mattermost server');
                    return { success: false, errorMessage: 'Unexpected response from Mattermost server' };
                }
            } catch (sendError) {
                const errorResult = this.handleMattermostError(sendError, 'send message');
                await this.messageRepository.markAsFailed(msg.id, errorResult.errorMessage || 'Failed to send message');
                return errorResult;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            logger.error('Mattermost send failed (database error):', { 
                error: errorMessage,
                recipient: sanitizedChannelId
            });
            return { success: false, errorMessage: `Database error: ${errorMessage}` };
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
     * Get user by email address
     */
    async getUserByEmail(email: string): Promise<{ id: string; username: string } | null> {
        try {
            if (!this.isConnected || !this.config) {
                return null;
            }

            const response = await this.axios.get(`/users/email/${email}`);
            if (response.status === 200 && response.data) {
                return {
                    id: response.data.id,
                    username: response.data.username
                };
            }
            return null;
        } catch (error) {
            logger.error(`Error getting user by email ${email}:`, error);
            return null;
        }
    }

    /**
     * Create direct message channel with user
     */
    async createDirectMessageChannel(userId: string): Promise<string | null> {
        try {
            if (!this.isConnected || !this.config) {
                return null;
            }

            // Get current user ID first
            const meResponse = await this.axios.get('/users/me');
            if (meResponse.status !== 200) {
                return null;
            }

            const currentUserId = meResponse.data.id;
            
            // Create direct message channel
            const response = await this.axios.post('/channels/direct', [
                currentUserId,
                userId
            ]);
            
            if (response.status === 201 && response.data) {
                return response.data.id;
            }
            return null;
        } catch (error) {
            logger.error(`Error creating DM channel with user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Send message by email (convenience method)
     */
    async sendTextByEmail(email: string, message: string, metadata?: Record<string, any>): Promise<SendResult> {
        // Input validation
        if (!email || typeof email !== 'string') {
            return { success: false, errorMessage: 'Email address is required' };
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return { success: false, errorMessage: 'Message content is required' };
        }

        try {
            // Create message record in database with email as recipient
            const msg = await this.messageRepository.create({
                service: 'mattermost' as ServiceType,
                recipient: email,
                message: message.trim(),
                status: 'pending',
                timestamp: new Date(),
                metadata: { ...metadata, recipientType: 'email' },
                requestedBy: (metadata && (metadata as any).requestedBy) || (global as any).__requestedBy || 'admin',
            } as any);

            // Connection validation
            if (!this.isConnected || !this.config) {
                await this.messageRepository.markAsFailed(msg.id, 'Mattermost not connected. Please configure and connect first.');
                return { success: false, errorMessage: 'Mattermost not connected. Please configure and connect first.' };
            }

            try {
                // First, get user by email
                const user = await this.getUserByEmail(email);
                if (!user) {
                    await this.messageRepository.markAsFailed(msg.id, `User with email ${email} not found in Mattermost`);
                    return { 
                        success: false, 
                        errorMessage: `User with email ${email} not found in Mattermost` 
                    };
                }

                // Create direct message channel
                const channelId = await this.createDirectMessageChannel(user.id);
                if (!channelId) {
                    await this.messageRepository.markAsFailed(msg.id, `Could not create direct message channel with user ${email}`);
                    return { 
                        success: false, 
                        errorMessage: `Could not create direct message channel with user ${email}` 
                    };
                }

                // Update the message record with resolved channel ID
                await this.messageRepository.updateById(msg.id, { 
                    metadata: { 
                        ...metadata, 
                        recipientType: 'email',
                        resolvedChannelId: channelId,
                        targetEmail: email,
                        targetUsername: user.username 
                    }
                });

                logger.info(`Sending Mattermost message by email to: ${email} (resolved to channel: ${channelId})`);

                // Prepare the message payload
                const payload = {
                    channel_id: channelId,
                    message: message.trim(),
                    props: {
                        ...metadata,
                        targetEmail: email,
                        targetUsername: user.username
                    }
                };

                // Send message via REST API
                const response = await this.axios.post('/posts', payload);

                if (response.status === 201 && response.data) {
                    const messageId = response.data.id;
                    await this.messageRepository.markAsSent(msg.id, messageId);
                    logger.info(`Mattermost message sent successfully to ${email}. Post ID: ${messageId}`);
                    
                    return {
                        success: true,
                        messageId: messageId,
                        metadata: {
                            channelId: channelId,
                            postId: messageId,
                            createAt: response.data.create_at,
                            targetEmail: email,
                            targetUsername: user.username
                        }
                    };
                } else {
                    await this.messageRepository.markAsFailed(msg.id, 'Unexpected response from Mattermost server');
                    return { success: false, errorMessage: 'Unexpected response from Mattermost server' };
                }
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error sending message by email';
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                logger.error(`Error sending message by email to ${email}:`, sendError);
                return {
                    success: false,
                    errorMessage
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            logger.error('Mattermost send by email failed (database error):', { 
                error: errorMessage,
                email: email
            });
            return { success: false, errorMessage: `Database error: ${errorMessage}` };
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
     * Load existing Mattermost credentials from database
     */
    async loadExistingCredentials(): Promise<void> {
        try {
            const credentials = await this.statusRepository.getMattermostCredentials();
            if (credentials) {
                logger.info('Found existing Mattermost credentials in database');
                await this.initialize(credentials);
            } else {
                logger.info('No existing Mattermost credentials found');
            }
        } catch (error) {
            logger.error('Failed to load existing Mattermost credentials:', error);
        }
    }

    /**
     * Check if Mattermost is configured (has credentials)
     */
    isConfigured(): boolean {
        return this.config !== null;
    }

    /**
     * Can auto-connect (has valid configuration)
     */
    canAutoConnect(): boolean {
        return !!(this.config && this.config.serverUrl && this.config.accessToken);
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
