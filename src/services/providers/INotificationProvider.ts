import { ServiceType } from '@/types';

export interface SendResult {
    success: boolean;
    messageId?: string;
    externalMessageId?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

export interface INotificationProvider {
    getServiceType(): ServiceType;
    initialize(config?: any): Promise<void>;
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    isServiceConnected(): boolean;
    sendText(recipient: string, message: string, metadata?: Record<string, any>): Promise<SendResult>;
    sendMedia(recipient: string, mediaPath: string, caption?: string, metadata?: Record<string, any>): Promise<SendResult>;
}
