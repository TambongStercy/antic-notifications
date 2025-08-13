export interface NotificationRequest {
  recipient: string;
  message: string;
  type?: 'text' | 'media';
  metadata?: Record<string, any>;
}

export interface ServiceStatus {
  service: 'whatsapp' | 'telegram';
  status: 'connected' | 'disconnected' | 'authenticating';
  lastUpdated: Date;
  metadata?: {
    qrCode?: string;
    botToken?: string;
    connectionInfo?: any;
  };
}

export interface MessageRecord {
  id: string;
  service: 'whatsapp' | 'telegram';
  recipient: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp: Date;
  errorMessage?: string;
  messageId?: string;
  metadata?: Record<string, any>;
  requestedBy?: string; // 'admin' or api key id/name
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

export interface AdminUser {
  id: string;
  username: string;
  role: 'admin';
  lastLogin?: Date;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    whatsapp: 'connected' | 'disconnected' | 'authenticating' | 'not_configured';
    telegram: 'connected' | 'disconnected' | 'not_configured';
  };
  uptime: number;
  version: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export type ServiceType = 'whatsapp' | 'telegram';
export type MessageStatus = 'pending' | 'sent' | 'failed';
export type ConnectionStatus = 'connected' | 'disconnected' | 'authenticating';

// WebSocket event types
export interface WebSocketEvents {
  'qr-code': { service: ServiceType; qrCode: string };
  'service-status': { service: ServiceType; status: ConnectionStatus };
  'message-status': { messageId: string; status: MessageStatus };
  'error': { service: ServiceType; error: string };
}