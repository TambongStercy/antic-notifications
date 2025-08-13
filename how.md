## 🚀 **Project Overview**

Your **Antic Notification Service** is a comprehensive notification system that allows you to send messages via **WhatsApp** and **Telegram** through REST APIs. It consists of:

1. **Backend API Service** (Node.js/TypeScript)
2. **Admin Dashboard** (React/TypeScript)
3. **MongoDB Database**
4. **Docker Support** for easy deployment

## 📋 **Prerequisites**

- **Node.js** 18+
- **MongoDB** 4.4+
- **Git**
- **Docker & Docker Compose** (optional but recommended)

## 🛠️ **How to Run the Application**

### **Option 1: Docker (Recommended)**

1. **Setup Environment**:
```bash
# Copy the clean environment template
cp env.example.clean .env

# Edit the .env file with your values
# IMPORTANT: Change JWT secrets for production!
```

2. **Start with Docker**:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f notification-service
```

This will start:
- **API Service**: http://localhost:3000
- **WebSocket**: ws://localhost:3002
- **MongoDB**: localhost:27017
- **Mongo Express**: http://localhost:8081

### **Option 2: Manual Development Setup**

1. **Install Backend Dependencies**:
```bash
npm install
```

2. **Install Admin Dashboard Dependencies**:
```bash
cd admin-dashboard
npm install
cd ..
```

3. **Setup Environment**:
```bash
cp env.example.clean .env
# Edit .env with your MongoDB URI and secrets
```

4. **Start Backend**:
```bash
npm run dev
```

5. **Start Admin Dashboard** (in new terminal):
```bash
cd admin-dashboard
npm run dev
```

## 🔧 **Initial Configuration**

### **1. Admin Authentication**

Get your JWT token for admin operations:

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Save the `accessToken` for authenticated requests.

### **2. Configure Telegram Bot**

1. **Create a Telegram Bot**:
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Use `/newbot` command
   - Get your bot token

2. **Set the Bot Token**:
```bash
curl -X POST http://localhost:3000/api/admin/telegram/token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"botToken":"YOUR_BOT_TOKEN"}'
```

3. **Connect Telegram Service**:
```bash
curl -X POST http://localhost:3000/api/admin/telegram/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **3. Configure WhatsApp**

1. **Connect WhatsApp**:
```bash
curl -X POST http://localhost:3000/api/admin/whatsapp/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

2. **Get QR Code for Authentication**:
```bash
curl -X GET http://localhost:3000/api/admin/qr \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

3. **Scan the QR code** with WhatsApp on your phone to authenticate.

## 📱 **Using the Admin Dashboard**

Access the admin dashboard at: **http://localhost:3001**

**Default Login**:
- Username: `admin`
- Password: `admin123`

**Dashboard Features**:
- **🏠 Dashboard**: Service status, message statistics, real-time monitoring
- **🔧 Services**: WhatsApp/Telegram configuration and QR code display
- **💬 Messages**: View, filter, retry messages
- **⚙️ Settings**: System configuration and API documentation

## 📡 **Sending Messages via API**

### **WhatsApp Message**
```bash
curl -X POST http://localhost:3000/api/notifications/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+237123456789",
    "message": "Hello from WhatsApp API! 📱",
    "metadata": {"source": "api"}
  }'
```

### **Telegram Message**
```bash
# Using username
curl -X POST http://localhost:3000/api/notifications/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "@username",
    "message": "Hello from Telegram API! 🚀",
    "metadata": {"source": "api"}
  }'

# Using chat ID
curl -X POST http://localhost:3000/api/notifications/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "123456789",
    "message": "Hello from Telegram API! 🚀"
  }'
```

## 🔍 **Monitoring and Management**

### **Health Check**
```bash
curl http://localhost:3000/api/health
```

### **Service Status**
```bash
curl http://localhost:3000/api/admin/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Message History**
```bash
curl "http://localhost:3000/api/messages?service=whatsapp&status=sent&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Message Statistics**
```bash
curl http://localhost:3000/api/messages/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🌐 **Real-time Updates**

Connect to WebSocket for live updates:

```javascript
const socket = io('http://localhost:3002');

// QR Code updates
socket.on('qr-code', (data) => {
  console.log('New QR code:', data.qrCode);
});

// Service status changes
socket.on('service-status', (data) => {
  console.log('Service status:', data);
});

// Message status updates
socket.on('message-status', (data) => {
  console.log('Message update:', data);
});
```

## 🚀 **Production Deployment**

1. **Update Environment Variables**:
   - Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong values
   - Update `ADMIN_PASSWORD`
   - Set `NODE_ENV=production`

2. **Deploy with Docker**:
```bash
docker-compose up -d --scale notification-service=2
```

3. **Monitor Services**:
```bash
docker-compose logs -f
```

## 🔒 **Security Notes**

- ✅ Uses **FCFA** as default currency [[memory:4605649]]
- ✅ Implements logging service that intercepts requests/responses [[memory:4605649]]
- ✅ Rate limiting enabled
- ✅ JWT authentication required for admin operations
- ✅ Input validation on all endpoints
- ✅ CORS protection configured

## 🎯 **Key Features**

- ✅ **WhatsApp Web.js** integration with QR authentication
- ✅ **Telegram Bot API** with token validation
- ✅ **Message Queue** with automatic retry for failed messages
- ✅ **Real-time WebSocket** updates for QR codes and status
- ✅ **MongoDB** storage with comprehensive tracking
- ✅ **Modern React Dashboard** with Material-UI
- ✅ **Docker containerization** for easy deployment
- ✅ **Complete REST API** with validation and error handling
