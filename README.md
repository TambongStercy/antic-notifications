# Antic Notification Service

A comprehensive notification service for sending WhatsApp and Telegram messages via REST API, built with Node.js, TypeScript, and MongoDB.

## Features

- ✅ **WhatsApp Integration**: Real WhatsApp Web.js with QR code authentication
- ✅ **Telegram Integration**: Telegram Bot API with token validation
- ✅ **REST API**: Complete RESTful endpoints with validation
- ✅ **Authentication**: JWT-based admin authentication
- ✅ **Message Queue**: Automatic retry mechanism for failed messages
- ✅ **Real-time Updates**: WebSocket support for QR codes and status
- ✅ **MongoDB Storage**: Comprehensive message and status tracking
- ✅ **Docker Support**: Complete containerization setup
- ✅ **Security**: Rate limiting, input validation, CORS protection

## Quick Start

### 1. Environment Setup

Copy the environment file and configure:
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/notification-service

# JWT Secrets (generate strong keys)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long

# Admin User
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Optional: Telegram Bot Token (can be set via API)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 2. Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or use Docker
docker-compose up
```

The service will be available at:
- **API**: http://localhost:3000
- **WebSocket**: ws://localhost:3002
- **Health Check**: http://localhost:3000/api/health

### 3. First Steps

1. **Admin Login**: Get JWT token for admin operations
2. **Configure Telegram**: Set bot token via admin API
3. **Connect WhatsApp**: Scan QR code for authentication
4. **Send Messages**: Use notification endpoints

## API Documentation

### Authentication

Get admin JWT token:
```bash
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Notifications

#### Send WhatsApp Message
```bash
POST /api/notifications/whatsapp
Content-Type: application/json

{
  "recipient": "+237123456789",
  "message": "Hello from WhatsApp!",
  "metadata": {
    "source": "api"
  }
}

# Response
{
  "messageId": "wa_1640995200000"
}
```

#### Send Telegram Message
```bash
POST /api/notifications/telegram
Content-Type: application/json

{
  "recipient": "@username",  # or chat ID: "123456789"
  "message": "Hello from Telegram!",
  "metadata": {
    "source": "api"
  }
}

# Response
{
  "messageId": "tg_1640995200000"
}
```

### Admin Operations

All admin operations require `Authorization: Bearer <token>` header.

#### Service Status
```bash
GET /api/admin/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Response
[
  {
    "service": "whatsapp",
    "status": "connected",
    "lastUpdated": "2023-12-01T10:00:00.000Z"
  },
  {
    "service": "telegram", 
    "status": "not_configured",
    "lastUpdated": "2023-12-01T10:00:00.000Z"
  }
]
```

#### Configure Telegram Bot
```bash
POST /api/admin/telegram/token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "botToken": "123456789:ABCdefGhIJKlmNOPQRSTUVWXYZabcdefghi"
}
```

#### WhatsApp QR Code
```bash
GET /api/admin/qr
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Response
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### Control Services
```bash
# Connect WhatsApp
POST /api/admin/whatsapp/connect
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Disconnect WhatsApp  
POST /api/admin/whatsapp/disconnect
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Connect Telegram (after token is set)
POST /api/admin/telegram/connect
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Disconnect Telegram
POST /api/admin/telegram/disconnect  
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Message History

#### Get Messages
```bash
GET /api/messages?service=whatsapp&status=sent&page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Response
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "service": "whatsapp",
      "recipient": "+237123456789", 
      "message": "Hello!",
      "status": "sent",
      "timestamp": "2023-12-01T10:00:00.000Z",
      "messageId": "wa_1640995200000"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Message Statistics
```bash
GET /api/messages/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Response
{
  "messageStats": [
    {
      "service": "whatsapp",
      "stats": [
        {"status": "sent", "count": 120},
        {"status": "failed", "count": 5}
      ],
      "total": 125
    }
  ],
  "queueStats": {
    "pendingMessages": 3,
    "failedMessages": 8,
    "retryableMessages": 2
  }
}
```

#### Retry Failed Message
```bash
POST /api/messages/507f1f77bcf86cd799439011/retry
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Response
{
  "success": true,
  "message": "Message queued for retry"
}
```

### Health Check

```bash
GET /api/health

# Response
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "services": {
    "database": "connected",
    "whatsapp": "connected", 
    "telegram": "not_configured"
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

## WebSocket Events

Connect to `ws://localhost:3002` for real-time updates:

```javascript
const socket = io('http://localhost:3002');

// QR Code updates
socket.on('qr-code', (data) => {
  console.log('New QR code:', data.qrCode);
  // data: { service: 'whatsapp', qrCode: 'data:image/png;base64,...' }
});

// Service status changes
socket.on('service-status', (data) => {
  console.log('Service status:', data);
  // data: { service: 'whatsapp', status: 'connected' }
});

// Message status updates
socket.on('message-status', (data) => {
  console.log('Message update:', data);
  // data: { messageId: 'wa_123', status: 'sent' }
});
```

## Error Handling

All API responses follow consistent error format:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      {
        "field": "recipient",
        "message": "WhatsApp recipient must be a valid phone number"
      }
    ]
  },
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/notifications/whatsapp"
}
```

## Currency Configuration

The service uses **FCFA** as the default currency for any pricing-related features.

## Deployment

### Docker (Recommended)

```bash
# Production deployment
docker-compose up -d

# View logs
docker-compose logs -f notification-service

# Scale if needed
docker-compose up -d --scale notification-service=3
```

### Manual Deployment

```bash
# Build
npm run build

# Start production
NODE_ENV=production npm start
```

## Development

```bash
# Install dependencies
npm install

# Start development with auto-reload
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │───▶│   Express API   │───▶│   WhatsApp/TG   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │    MongoDB      │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │  Message Queue  │
                       └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please create an issue in the repository.