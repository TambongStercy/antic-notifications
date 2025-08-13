import { Server } from 'socket.io';
import { createServer } from 'http';
import { config } from '@/config/environment';
import logger from '@/utils/logger';
import NotificationService from '@/services/NotificationService';

export class WebSocketService {
    private io?: Server;

    constructor(private service: NotificationService) { }

    public start(): void {
        const httpServer = createServer();
        this.io = new Server(httpServer, { cors: { origin: '*', credentials: true } });

        httpServer.listen(config.websocket.port, () => {
            logger.info(`WebSocket server listening on port ${config.websocket.port}`);
        });

        const { whatsapp } = this.service.getProviders();
        
        // Enhanced WhatsApp status updates
        whatsapp.on('qr', (qr) => {
            this.broadcast('whatsapp-status', { 
                status: 'qr_ready', 
                message: 'QR code generated. Please scan with your phone.',
                qrCode: qr,
                timestamp: new Date().toISOString()
            });
        });
        
        whatsapp.on('connecting', () => {
            this.broadcast('whatsapp-status', { 
                status: 'connecting', 
                message: 'Initializing WhatsApp connection...',
                timestamp: new Date().toISOString()
            });
        });
        
        whatsapp.on('authenticated', () => {
            this.broadcast('whatsapp-status', { 
                status: 'authenticating', 
                message: 'Authentication successful. Connecting to WhatsApp...',
                timestamp: new Date().toISOString()
            });
        });
        
        whatsapp.on('ready', () => {
            this.broadcast('whatsapp-status', { 
                status: 'connected', 
                message: 'WhatsApp is connected and ready to send messages.',
                timestamp: new Date().toISOString()
            });
        });
        
        whatsapp.on('disconnected', (reason) => {
            this.broadcast('whatsapp-status', { 
                status: 'disconnected', 
                message: `WhatsApp disconnected: ${reason || 'Unknown reason'}`,
                timestamp: new Date().toISOString()
            });
        });

        whatsapp.on('stream-error', (reason) => {
            this.broadcast('whatsapp-status', { 
                status: 'stream-error', 
                message: `WhatsApp stream error: ${reason}. Use "Fix Stream Error" to recover.`,
                timestamp: new Date().toISOString()
            });
        });

        whatsapp.on('reconnection-loop', (attempts) => {
            this.broadcast('whatsapp-status', { 
                status: 'reconnection-loop', 
                message: `WhatsApp stuck in reconnection loop (${attempts} attempts). Use "Stop Reconnection" to break the loop.`,
                timestamp: new Date().toISOString()
            });
        });

        // Legacy events for backward compatibility
        whatsapp.on('qr', (qr) => this.broadcast('qr-code', { service: 'whatsapp', qrCode: qr }));
        whatsapp.on('ready', () => this.broadcast('service-status', { service: 'whatsapp', status: 'connected' }));
        whatsapp.on('authenticated', () => this.broadcast('service-status', { service: 'whatsapp', status: 'connected' }));
        whatsapp.on('disconnected', () => this.broadcast('service-status', { service: 'whatsapp', status: 'disconnected' }));

        // Telegram events
        const { telegram } = this.service.getProviders();
        
        telegram.on('code-required', () => {
            this.broadcast('telegram-code-required', {
                message: 'Verification code required for Telegram authentication',
                timestamp: new Date().toISOString()
            });
        });

        telegram.on('password-required', () => {
            this.broadcast('telegram-password-required', {
                message: '2FA password required for Telegram authentication',
                timestamp: new Date().toISOString()
            });
        });

        telegram.on('authenticated', () => {
            this.broadcast('telegram-authenticated', {
                message: 'Telegram authenticated successfully',
                timestamp: new Date().toISOString()
            });
        });

        telegram.on('connected', () => {
            this.broadcast('service-status', { service: 'telegram', status: 'connected' });
        });

        telegram.on('disconnected', () => {
            this.broadcast('service-status', { service: 'telegram', status: 'disconnected' });
        });
    }

    public broadcast(event: string, payload: any) {
        this.io?.emit(event, payload);
    }
}

export default WebSocketService;


