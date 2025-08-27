# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js/TypeScript notification service that provides API endpoints for sending WhatsApp and Telegram messages. It features an admin dashboard, MongoDB for persistence, and WebSocket for real-time updates.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with auto-reload
- `npm run start:dev` - Start development server with ts-node
- `npm run build` - Build TypeScript to JavaScript (outputs to `dist/`)
- `npm start` - Start production server from built files
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint on source files
- `npm run lint:fix` - Run ESLint with auto-fix

### Database Commands
- `npm run init-db` - Initialize database with default admin user
- `npm run init-db:samples` - Initialize database with sample data

### Docker Commands
- `npm run docker:build` - Build Docker image
- `npm run docker:up` - Start all services with docker-compose
- `npm run docker:down` - Stop docker-compose services
- `npm run docker:logs` - View notification service logs

## Architecture

### Core Service Structure
The application follows a layered architecture:

1. **API Layer** (`src/api/`):
   - Controllers handle HTTP requests/responses
   - Routes define endpoints
   - Middleware for auth, validation, error handling

2. **Service Layer** (`src/services/`):
   - `NotificationService` - Main orchestrator
   - `BaileysWhatsAppProvider` - WhatsApp integration using Baileys
   - `GramJSTelegramProvider` - Telegram integration 
   - `MessageQueueService` - Message retry logic
   - `WebSocketServer` - Real-time updates

3. **Data Layer** (`src/database/`):
   - MongoDB models and repositories
   - Repository pattern for data access

### Key Components

#### NotificationService (`src/services/NotificationService.ts`)
Central service that orchestrates message sending. Manages provider connections and handles initialization sequence.

#### Provider Pattern
WhatsApp and Telegram providers implement common interface for message sending. Located in `src/services/providers/`.

#### Repository Pattern
Data access abstracted through repositories (`src/database/repositories/`), making testing and data layer changes easier.

#### Path Aliases
The project uses TypeScript path mapping with `@/` as the base:
- `@/api/*` → `src/api/*`
- `@/config/*` → `src/config/*`
- `@/database/*` → `src/database/*`
- `@/services/*` → `src/services/*`
- `@/utils/*` → `src/utils/*`
- `@/types/*` → `src/types/*`

## Configuration & Environment

### Required Environment Variables
Copy `env.example` to `.env` and configure:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` & `JWT_REFRESH_SECRET` - Must be 32+ characters
- `ADMIN_USERNAME` & `ADMIN_PASSWORD` - Default admin credentials
- `TELEGRAM_BOT_TOKEN` - Optional, can be set via API

### Configuration System
Environment configuration is handled in `src/config/environment.ts` with Joi validation. All config is strongly typed and validated at startup.

## Authentication Flow

1. **Admin Login**: POST `/api/admin/login` with username/password
2. **Service Configuration**: Use JWT token to configure Telegram bot token
3. **WhatsApp Setup**: Connect WhatsApp (generates QR code for scanning)
4. **Telegram Setup**: Connect Telegram bot after token configuration

## Testing

### Test Structure
- Unit tests in `tests/` directory
- Jest configuration in `jest.config.js`
- Test database uses MongoDB Memory Server
- Path mapping configured for imports

### Running Tests
- Individual test: `npm test -- --testNamePattern="specific test"`
- Single file: `npm test -- path/to/test.ts`

## Database Models

### Key Collections
- `messages` - Message records with status tracking
- `servicestatuses` - WhatsApp/Telegram connection states
- `adminusers` - Admin authentication

### Repository Pattern
Access data through repositories in `src/database/repositories/` rather than directly through models.

## Development Workflow

### Service Initialization Sequence
1. Database connection established
2. Telegram credentials loaded if available
3. WhatsApp provider initialized (may show QR code)
4. Auto-connect Telegram if session exists
5. Message queue processing starts

### Error Handling
- Global error middleware in `src/api/middleware/errorHandler.ts`
- Structured logging with Winston
- Service-specific error handling with retry mechanisms

### WebSocket Integration
Real-time updates for:
- QR code generation
- Service status changes
- Message status updates

Connect to `ws://localhost:3002` for real-time events.

## Special Considerations

### WhatsApp Integration
- Uses Baileys library for WhatsApp Web protocol
- QR code authentication required on first setup
- Session data stored in `sessions/whatsapp/`
- May require re-authentication periodically

### Telegram Integration
- Supports both Bot API tokens and user sessions
- Bot tokens can be configured via admin API
- Auto-reconnect capability if session exists

### Message Queue
- Failed messages automatically queued for retry
- Configurable retry intervals and limits
- Queue processing runs in background

### Admin Dashboard
Separate React frontend in `admin-dashboard/` directory with its own build process.

## Debugging Tips

### Common Issues
- **WhatsApp QR Issues**: Check session files in `sessions/whatsapp/`, may need to delete and re-authenticate
- **Telegram Connection**: Verify bot token format (should be `123456789:ABC...`)
- **Database Connection**: Ensure MongoDB is running and URI is correct

### Logging
- Application logs in `logs/app.log`
- Error logs in `logs/error.log`
- Docker logs via `npm run docker:logs`

### Health Checks
- Basic health: GET `/api/health`
- Detailed status: GET `/api/admin/status` (requires auth)