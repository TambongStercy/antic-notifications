# Setup Guide

This guide will help you get the Antic Notification Service up and running quickly.

## Prerequisites

- **Node.js** 18+ 
- **MongoDB** 4.4+
- **Git**

## Quick Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd antic-notitification-service
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**

```env
# Database
MONGODB_URI=mongodb://localhost:27017/notification-service

# JWT Secrets (MUST be changed for production)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Optional: Telegram Bot Token
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 3. Start Services

**Option A: Development Mode**
```bash
npm run start:dev
```

**Option B: Docker (Recommended)**
```bash
docker-compose up -d
```

### 4. Verify Installation

Check health endpoint:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "whatsapp": "not_configured",
    "telegram": "not_configured"
  }
}
```

## Service Configuration

### 1. Admin Authentication

Get your JWT token:

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Save the `accessToken` for authenticated requests.

### 2. Configure Telegram Bot

First, create a Telegram bot:
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Use `/newbot` command
3. Follow instructions to get your bot token

Configure the service:
```bash
curl -X POST http://localhost:3000/api/admin/telegram/token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"botToken":"YOUR_BOT_TOKEN"}'
```

Connect Telegram:
```bash
curl -X POST http://localhost:3000/api/admin/telegram/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Configure WhatsApp

Connect WhatsApp (will generate QR code):
```bash
curl -X POST http://localhost:3000/api/admin/whatsapp/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Get QR code for scanning:
```bash
curl -X GET http://localhost:3000/api/admin/qr \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

The QR code will be returned as base64 data URL that you can display in a browser or decode to image.

## Testing the Service

### Send WhatsApp Message

```bash
curl -X POST http://localhost:3000/api/notifications/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+237123456789",
    "message": "Hello from WhatsApp API! 📱"
  }'
```

### Send Telegram Message

```bash
curl -X POST http://localhost:3000/api/notifications/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "@username",
    "message": "Hello from Telegram API! 🚀"
  }'
```

## Real-time Updates

Connect to WebSocket for real-time updates:

```javascript
// In browser or Node.js
const socket = io('http://localhost:3002');

socket.on('qr-code', (data) => {
  console.log('New QR code:', data.qrCode);
  // Display QR code to user
});

socket.on('service-status', (data) => {
  console.log('Service status changed:', data);
  // Update UI status
});
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check if MongoDB is running
   mongosh --eval "db.adminCommand('ping')"
   
   # Start MongoDB if not running
   sudo systemctl start mongod  # Linux
   brew services start mongodb-community  # macOS
   ```

2. **WhatsApp QR Code Issues**
   ```bash
   # Check WhatsApp status
   curl http://localhost:3000/api/admin/status \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   
   # Restart WhatsApp connection
   curl -X POST http://localhost:3000/api/admin/whatsapp/disconnect \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   curl -X POST http://localhost:3000/api/admin/whatsapp/connect \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Telegram Bot Issues**
   ```bash
   # Verify bot token format
   # Should be: 123456789:ABCdefGhIJKlmNOPQRSTUVWXYZabcdefghi
   
   # Test bot manually
   curl "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getMe"
   ```

4. **Permission Issues**
   ```bash
   # Ensure proper file permissions
   chmod -R 755 sessions/
   chown -R $USER:$USER sessions/
   ```

### Logs

View application logs:
```bash
# Development
tail -f logs/app.log

# Docker
docker-compose logs -f notification-service
```

### Database Inspection

```bash
# Connect to MongoDB
mongosh notification-service

# View collections
show collections

# Check messages
db.messages.find().limit(5)

# Check service status
db.servicestatuses.find()
```

## Production Deployment

### Docker Production

1. **Update Environment**:
   ```bash
   # Copy production environment
   cp env.example .env.production
   
   # Configure for production
   NODE_ENV=production
   MONGODB_URI=mongodb://mongo:27017/notification-service
   # ... other production values
   ```

2. **Deploy**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

### Manual Production

1. **Build Application**:
   ```bash
   npm run build
   ```

2. **Start with PM2**:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "notification-service"
   pm2 save
   pm2 startup
   ```

## Security Considerations

1. **Change Default Credentials**:
   - Update `ADMIN_PASSWORD` in production
   - Use strong, unique JWT secrets

2. **Network Security**:
   - Use HTTPS in production
   - Configure firewall rules
   - Restrict MongoDB access

3. **Data Protection**:
   - Regular database backups
   - Encrypt sensitive data
   - Monitor access logs

## Performance Tuning

1. **Database Optimization**:
   ```javascript
   // MongoDB indexes are already configured
   // Monitor query performance
   db.messages.find().explain("executionStats")
   ```

2. **Rate Limiting**:
   ```env
   # Adjust in .env
   RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
   RATE_LIMIT_MAX_REQUESTS=100  # per window
   ```

3. **Message Queue**:
   ```env
   # Queue processing interval (milliseconds)
   QUEUE_PROCESS_INTERVAL=30000
   ```

## Monitoring

### Health Checks

```bash
# Basic health
curl http://localhost:3000/api/health

# Detailed status
curl http://localhost:3000/api/admin/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Message statistics
curl http://localhost:3000/api/messages/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Metrics

Key metrics to monitor:
- Message send success rate
- Service connection status
- Database query performance
- API response times
- Queue processing delays

## Support

For additional help:
1. Check the main [README.md](../README.md)
2. Review API documentation in [docs/api/](./api/)
3. Create an issue in the repository
