# Mattermost Integration Guide

This document explains how Mattermost is integrated into the notification service application and how to use it.

## Overview

The notification service now supports sending messages to Mattermost channels alongside WhatsApp and Telegram. The integration uses Mattermost's REST API with Personal Access Tokens for authentication.

## Architecture

### Backend Components

#### 1. MattermostProvider (`src/services/providers/MattermostProvider.ts`)
- **Purpose**: Handles all Mattermost API communication
- **Authentication**: Uses Personal Access Tokens (recommended by Mattermost)
- **Capabilities**:
  - Send text messages to channels
  - Test server connectivity
  - Validate channel IDs
  - Retrieve available channels
  - Handle comprehensive error responses

#### 2. Database Integration
- **ServiceStatus Model**: Extended to support Mattermost metadata
- **ServiceStatusRepository**: Added Mattermost-specific methods:
  - `setMattermostConfig(serverUrl, accessToken)`
  - `getMattermostConfig()`
  - `clearMattermostConfig()`
  - `markAsConnected('mattermost')`
  - `markAsDisconnected('mattermost')`

#### 3. Admin API Endpoints
- `POST /api/admin/mattermost/config` - Set server URL and access token
- `POST /api/admin/mattermost/connect` - Connect to Mattermost server
- `POST /api/admin/mattermost/disconnect` - Disconnect from server
- `GET /api/admin/mattermost/status` - Get connection status and configuration
- `DELETE /api/admin/mattermost/config` - Clear stored configuration

#### 4. NotificationService Integration
- Added `mattermost` provider to service dependencies
- New `sendMattermost(request)` method
- Health check includes Mattermost status
- Provider accessible via `getProviders().mattermost`

## Setup Process

### 1. Prerequisites
- Running Mattermost server (self-hosted or cloud)
- Admin access to create Personal Access Tokens
- Bot account or user account with channel posting permissions

### 2. Get Personal Access Token

#### Option A: Create Bot Account (Recommended)
```bash
# In Mattermost System Console:
# 1. Go to Integrations > Bot Accounts
# 2. Create new bot account
# 3. Generate Personal Access Token for the bot
```

#### Option B: Use User Account
```bash
# In Mattermost:
# 1. Go to Account Settings > Security > Personal Access Tokens
# 2. Create new token with description
# 3. Copy token immediately (won't be shown again)
```

### 3. Configure via Admin API

```bash
# Set Mattermost configuration
curl -X POST http://localhost:3002/api/admin/mattermost/config \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "https://your-mattermost-server.com",
    "accessToken": "your-personal-access-token"
  }'

# Connect to Mattermost
curl -X POST http://localhost:3002/api/admin/mattermost/connect \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"

# Check status
curl -X GET http://localhost:3002/api/admin/mattermost/status \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

### 4. Send Messages

Once configured and connected, you can send messages using the notification API:

```bash
# Send to Mattermost channel
curl -X POST http://localhost:3002/api/notifications/mattermost \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "channel_id_here",
    "message": "Hello from the notification service!"
  }'
```

## Channel ID Format

Mattermost uses 26-character alphanumeric channel IDs (e.g., `4xp9fdt7pbgium38k0k6w95oa4`).

### Finding Channel IDs

#### Method 1: Web Interface
1. Open channel in Mattermost web client
2. Look at URL: `https://server.com/team/channels/CHANNEL_ID`

#### Method 2: API Call
```bash
# Get channels for authenticated user
curl -X GET https://your-server.com/api/v4/users/me/teams/{team_id}/channels \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Method 3: Using the Provider (programmatically)
```typescript
const { mattermost } = notificationService.getProviders();
const channels = await mattermost.getAvailableChannels();
```

## Configuration Storage

### Database Schema
Mattermost configuration is stored in the `servicestatuses` collection:

```javascript
{
  service: 'mattermost',
  status: 'connected' | 'disconnected',
  lastUpdated: Date,
  metadata: {
    serverUrl: 'https://your-server.com',
    accessToken: 'token' // Stored securely, not exposed in API responses
  }
}
```

### Security Notes
- Access tokens are stored with `select: false` in the MongoDB schema
- Tokens are never exposed in JSON API responses
- Only `hasAccessToken: boolean` is returned in status checks
- Use HTTPS for all Mattermost communications

## Message Format

### Basic Text Message
```typescript
interface MattermostMessage {
  recipient: string;        // Channel ID (26 chars)
  message: string;         // Message text (supports Markdown)
  metadata?: {             // Optional metadata
    // Additional Mattermost post properties can go here
  };
}
```

### Response Format
```typescript
interface SendResult {
  success: boolean;
  messageId?: string;      // Mattermost post ID if successful
  errorMessage?: string;   // Error details if failed
  metadata?: {
    channelId: string;
    postId: string;
    createAt: number;      // Mattermost timestamp
  };
}
```

## Error Handling

The integration provides specific error messages for common scenarios:

### Connection Errors
- `"Cannot connect to Mattermost server. Please check the server URL."`
- `"Invalid access token. Please check your Mattermost personal access token."`
- `"Access denied. Please ensure the access token has sufficient permissions."`

### Message Sending Errors
- `"Channel not found. Please check the channel ID."`
- `"Bot may not have permission to post in this channel."`
- `"Invalid channel ID format. Must be 26 alphanumeric characters."`

### Configuration Errors
- `"Server URL and access token are required"`
- `"Mattermost server URL and access token must be configured first"`

## Monitoring and Health Checks

### Health Check Endpoint
```bash
curl -X GET http://localhost:3002/api/health
```

Response includes Mattermost status:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "whatsapp": "connected",
    "telegram": "connected",
    "mattermost": "connected"
  }
}
```

### Service Status
```bash
curl -X GET http://localhost:3002/api/admin/status \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

## Integration with Existing Features

### Message Queue
- Failed Mattermost messages are automatically queued for retry
- Uses the same retry logic as WhatsApp and Telegram
- Configurable retry intervals and maximum attempts

### Admin Dashboard
- Frontend types updated to include Mattermost service
- Ready for UI components following existing WhatsApp/Telegram patterns
- Service status polling includes Mattermost

### Logging
- Structured logging for all Mattermost operations
- Connection attempts, message sending, and errors are logged
- Uses the same logging format as other providers

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Verify access token is correct and not expired
   - Check if bot account is active
   - Ensure token has necessary permissions

2. **"Cannot connect to Mattermost server"**
   - Verify server URL is correct and accessible
   - Check firewall/network connectivity
   - Ensure server is running and responding

3. **"Channel not found"**
   - Verify channel ID format (26 alphanumeric characters)
   - Check if bot has access to the channel
   - Ensure channel exists and is not archived

4. **"Access denied"**
   - Bot may not have permission to post in channel
   - Check team membership for bot account
   - Verify channel permissions (public vs private)

### Debug Steps

1. **Test connectivity**:
   ```bash
   curl -X GET https://your-server.com/api/v4/users/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Check service status**:
   ```bash
   curl -X GET http://localhost:3002/api/admin/mattermost/status \
     -H "Authorization: Bearer YOUR_ADMIN_JWT"
   ```

3. **View logs**:
   ```bash
   # Check application logs for Mattermost-related entries
   tail -f logs/app.log | grep -i mattermost
   ```

## Development

### Adding Features

The MattermostProvider follows the same interface as other providers:

```typescript
interface INotificationProvider {
  getServiceType(): ServiceType;
  initialize(config?: any): Promise<void>;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isServiceConnected(): boolean;
  sendText(recipient: string, message: string, metadata?: Record<string, any>): Promise<SendResult>;
  sendMedia(recipient: string, mediaPath: string, caption?: string, metadata?: Record<string, any>): Promise<SendResult>;
}
```

### Testing

1. **Unit Tests**: Test the MattermostProvider class methods
2. **Integration Tests**: Test API endpoints with mock Mattermost server
3. **E2E Tests**: Test complete flow with real Mattermost instance

### Future Enhancements

Potential improvements:
- File/media attachment support
- Rich message formatting (cards, buttons)
- Message threading support
- Bulk message sending
- Webhook integration for incoming messages
- Multiple server support

## API Reference

### MattermostProvider Methods

```typescript
class MattermostProvider {
  // Initialize with server configuration
  async initialize(config: MattermostConfig): Promise<void>
  
  // Test and establish connection
  async connect(): Promise<boolean>
  
  // Disconnect from server
  async disconnect(): Promise<void>
  
  // Check connection status
  isServiceConnected(): boolean
  
  // Send text message to channel
  async sendText(channelId: string, message: string, metadata?: any): Promise<SendResult>
  
  // Get channel information
  async getChannelInfo(channelId: string): Promise<MattermostChannelInfo | null>
  
  // List available channels
  async getAvailableChannels(): Promise<MattermostChannelInfo[]>
}
```

### Configuration Interface

```typescript
interface MattermostConfig {
  serverUrl: string;        // Mattermost server URL
  accessToken: string;      // Personal Access Token
  defaultChannelId?: string; // Optional default channel
}
```

This integration provides a robust, production-ready Mattermost messaging capability that seamlessly integrates with your existing notification infrastructure.