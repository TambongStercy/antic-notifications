# Antic Notification Admin Dashboard

React-based admin dashboard for the Antic Notification Service.

## Features

- 🎯 **Modern React UI**: Built with React 18, TypeScript, and Material-UI
- 📊 **Real-time Dashboard**: Live statistics and service monitoring
- 🔐 **Secure Authentication**: JWT-based admin login
- 📱 **WhatsApp Integration**: QR code display and session management
- 🤖 **Telegram Management**: Bot token configuration and status monitoring
- 💬 **Message Management**: View, filter, and retry messages
- 🔌 **WebSocket Support**: Real-time updates for QR codes and service status
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile

## Quick Start

### 1. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit configuration (optional)
nano .env
```

Default configuration works with the backend running on localhost:3000.

### 3. Start Development Server

```bash
npm run dev
```

The dashboard will be available at http://localhost:3001

### 4. Login

Use the default admin credentials:
- **Username**: admin
- **Password**: admin123

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run lint
```

## Dashboard Features

### 🏠 Dashboard Page
- Service status overview (Database, WhatsApp, Telegram)
- Real-time message statistics
- Queue status monitoring
- Interactive charts and graphs
- System uptime and health metrics

### 🔧 Services Page
- **WhatsApp Configuration**:
  - Connect/disconnect WhatsApp Web
  - QR code display for authentication
  - Real-time connection status
  - Session management

- **Telegram Configuration**:
  - Bot token configuration
  - Connect/disconnect bot
  - Token validation
  - Connection status monitoring

### 💬 Messages Page
- View all sent/pending/failed messages
- Filter by service, status, and recipient
- Pagination and search functionality
- Message details popup
- Retry failed messages
- Send new messages directly from the UI

### ⚙️ Settings Page
- Application information and version
- Security configuration overview
- Storage and database settings
- API endpoint documentation
- System configuration details

## Architecture

```
admin-dashboard/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (Auth, Socket)
│   ├── pages/           # Main page components
│   ├── services/        # API service functions
│   ├── types/           # TypeScript type definitions
│   └── main.tsx         # Application entry point
├── public/              # Static assets
└── package.json         # Dependencies and scripts
```

## Key Components

### Authentication
- JWT token-based authentication
- Automatic token refresh
- Protected routes
- Login/logout functionality

### Real-time Updates
- WebSocket connection to backend
- Live QR code updates
- Service status changes
- Message status notifications

### API Integration
- Axios-based HTTP client
- Automatic error handling
- Request/response interceptors
- Type-safe API calls

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_WEBSOCKET_URL` | WebSocket server URL | `http://localhost:3002` |
| `VITE_NODE_ENV` | Environment mode | `development` |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Add proper error handling
4. Test on multiple screen sizes
5. Update documentation as needed

## Troubleshooting

### Common Issues

**1. API Connection Failed**
- Ensure backend is running on port 3000
- Check VITE_API_URL in .env file
- Verify CORS settings in backend

**2. WebSocket Connection Failed**
- Ensure WebSocket server is running on port 3002
- Check VITE_WEBSOCKET_URL in .env file
- Check firewall settings

**3. Login Failed**
- Verify admin credentials in backend .env
- Check JWT_SECRET configuration
- Ensure database is connected

**4. QR Code Not Showing**
- WhatsApp service must be in 'authenticating' status
- Check WebSocket connection
- Verify WhatsApp service is properly initialized

### Debug Mode

Enable debug logging by opening browser console and setting:
```javascript
localStorage.debug = '*'
```

## License

MIT License - see main project LICENSE file.
