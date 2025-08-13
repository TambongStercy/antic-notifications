import TelegramBot from 'node-telegram-bot-api';
import { MessageRepository } from '@/database/repositories/MessageRepository';
import { ServiceStatusRepository } from '@/database/repositories/ServiceStatusRepository';
import { ServiceType } from '@/types';
import logger from '@/utils/logger';

export interface SendResult {
    success: boolean;
    externalMessageId?: string;
    errorMessage?: string;
}

export class TelegramProvider {
    private messageRepository: MessageRepository;
    private statusRepository: ServiceStatusRepository;
    private bot: TelegramBot | null = null;
    private configured = false;
    private connected = false;
    private botToken?: string;

    constructor(
        deps?: {
            messageRepository?: MessageRepository;
            statusRepository?: ServiceStatusRepository;
        }
    ) {
        this.messageRepository = deps?.messageRepository ?? new MessageRepository();
        this.statusRepository = deps?.statusRepository ?? new ServiceStatusRepository();
    }

    public async configureBotToken(botToken: string): Promise<void> {
        if (!botToken || botToken.length < 10) {
            throw new Error('Invalid Telegram bot token');
        }

        // Validate token format (should be like: 123456789:ABCdefGhIJKlmNOPQRSTUVWXYZabcdefghi)
        const tokenRegex = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;
        if (!tokenRegex.test(botToken)) {
            throw new Error('Invalid Telegram bot token format');
        }

        try {
            // Test the token by creating a bot instance and getting bot info
            const testBot = new TelegramBot(botToken, { polling: false });
            await testBot.getMe();

            await this.statusRepository.setTelegramBotToken(botToken);
            this.botToken = botToken;
            this.configured = true;
            logger.info('Telegram bot token validated and saved');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
            logger.error('Telegram bot token validation failed:', errorMessage);
            throw new Error(`Invalid bot token: ${errorMessage}`);
        }
    }

    public async connect(): Promise<void> {
        if (!this.configured || !this.botToken) {
            throw new Error('Telegram bot not configured');
        }

        try {
            this.bot = new TelegramBot(this.botToken, {
                polling: false // We don't need polling for sending messages
            });

            // Test connection by getting bot info
            const botInfo = await this.bot.getMe();

            await this.statusRepository.markAsConnected('telegram', {
                connectionInfo: {
                    botId: botInfo.id,
                    botUsername: botInfo.username,
                    firstName: botInfo.first_name,
                }
            });

            this.connected = true;
            logger.info('Telegram provider connected', {
                botId: botInfo.id,
                username: botInfo.username
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            logger.error('Telegram connection failed:', errorMessage);
            await this.statusRepository.markAsDisconnected('telegram');
            throw new Error(`Failed to connect: ${errorMessage}`);
        }
    }

    public async connectSimulated(): Promise<void> {
        // Keep this method for backward compatibility in testing
        if (!this.configured) {
            throw new Error('Telegram bot not configured');
        }
        await this.statusRepository.markAsConnected('telegram');
        this.connected = true;
        logger.info('Telegram provider connected (simulated)');
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.bot) {
                // Telegram bot doesn't need explicit disconnection for send-only mode
                this.bot = null;
            }
            await this.statusRepository.markAsDisconnected('telegram');
            this.connected = false;
            logger.info('Telegram provider disconnected');
        } catch (error) {
            logger.error('Error disconnecting Telegram bot:', error);
            await this.statusRepository.markAsDisconnected('telegram');
            this.connected = false;
        }
    }

    public isConfigured(): boolean {
        return this.configured;
    }

    public isConnected(): boolean {
        return this.connected && this.bot !== null;
    }

    public async sendText(recipient: string, message: string, metadata?: Record<string, any>): Promise<SendResult> {
        try {
            const msg = await this.messageRepository.create({
                service: 'telegram' as ServiceType,
                recipient,
                message,
                status: 'pending',
                timestamp: new Date(),
                metadata: metadata ?? {},
            } as any);

            if (!this.connected || !this.bot) {
                await this.messageRepository.markAsFailed(msg.id, 'Telegram not connected');
                return { success: false, errorMessage: 'Telegram not connected' };
            }

            try {
                // Parse recipient as chat ID (number) or username (@username)
                let chatId: string | number = recipient;
                if (recipient.startsWith('@')) {
                    chatId = recipient; // Username format
                } else if (/^\d+$/.test(recipient)) {
                    chatId = parseInt(recipient, 10); // Chat ID format
                } else {
                    throw new Error('Invalid recipient format. Use chat ID (number) or @username');
                }

                const sentMessage = await this.bot.sendMessage(chatId, message);

                await this.messageRepository.markAsSent(msg.id, sentMessage.message_id.toString());
                return { success: true, externalMessageId: sentMessage.message_id.toString() };
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send message';
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Telegram send failed', { error: errorMessage });
            return { success: false, errorMessage };
        }
    }

    public async sendPhoto(recipient: string, photoPath: string, caption?: string, metadata?: Record<string, any>): Promise<SendResult> {
        try {
            const msg = await this.messageRepository.create({
                service: 'telegram' as ServiceType,
                recipient,
                message: caption || 'Photo message',
                status: 'pending',
                timestamp: new Date(),
                metadata: { ...metadata, photoPath },
            } as any);

            if (!this.connected || !this.bot) {
                await this.messageRepository.markAsFailed(msg.id, 'Telegram not connected');
                return { success: false, errorMessage: 'Telegram not connected' };
            }

            try {
                let chatId: string | number = recipient;
                if (recipient.startsWith('@')) {
                    chatId = recipient;
                } else if (/^\d+$/.test(recipient)) {
                    chatId = parseInt(recipient, 10);
                } else {
                    throw new Error('Invalid recipient format. Use chat ID (number) or @username');
                }

                const sentMessage = await this.bot.sendPhoto(chatId, photoPath, { caption });

                await this.messageRepository.markAsSent(msg.id, sentMessage.message_id.toString());
                return { success: true, externalMessageId: sentMessage.message_id.toString() };
            } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send photo';
                await this.messageRepository.markAsFailed(msg.id, errorMessage);
                return { success: false, errorMessage };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Telegram photo send failed', { error: errorMessage });
            return { success: false, errorMessage };
        }
    }

    public async loadExistingToken(): Promise<void> {
        try {
            const token = await this.statusRepository.getTelegramBotToken();
            if (token) {
                this.botToken = token;
                this.configured = true;
                logger.info('Loaded existing Telegram bot token from database');
            }
        } catch (error) {
            logger.error('Failed to load existing Telegram token:', error);
        }
    }
}

export default TelegramProvider;


