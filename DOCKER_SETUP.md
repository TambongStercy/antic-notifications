# Docker Setup Guide

This guide explains how to run the Anti-Notification Service using Docker containers.

## Architecture

The application consists of four main services:
- **Frontend (React + Nginx)**: Port 3001
- **Backend (Node.js)**: Port 3000 (API) and 3002 (WebSocket)
- **MongoDB**: Port 27017
- **Mongo Express**: Port 8081 (Database admin interface)

## Prerequisites

- Docker and Docker Compose installed
- At least 2GB of available RAM
- Ports 3000, 3001, 3002, 27017, and 8081 available

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd antic-notification-service
```

### 2. Create Environment File

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` and set secure values for:
- `JWT_SECRET` (32+ characters)
- `JWT_REFRESH_SECRET` (32+ characters)
- `ADMIN_PASSWORD` (secure admin password)
- `MONGO_ROOT_PASSWORD` (secure MongoDB password)
- `MONGOEXPRESS_PASSWORD` (secure Mongo Express password)

### 3. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 4. Access the Application

- **Frontend**: http://localhost:3001
- **API**: http://localhost:3000
- **Database Admin**: http://localhost:8081
- **API Documentation**: http://localhost:3000/api/health

## Environment Variables

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret (32+ chars) | Required |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (32+ chars) | Required |
| `ADMIN_PASSWORD` | Admin user password | Required |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | Required |
| `MONGOEXPRESS_PASSWORD` | Mongo Express admin password | Required |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USERNAME` | Admin username | admin |
| `PORT` | Backend API port | 3000 |
| `WEBSOCKET_PORT` | WebSocket port | 3002 |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:3001 |
| `LOG_LEVEL` | Logging level | info |

## Docker Commands

### Development

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up --build
```

### Production

```bash
# Production build
docker-compose -f docker-compose.yml up --build -d

# Scale services (if needed)
docker-compose up -d --scale notification-service=2
```

### Maintenance

```bash
# View container status
docker-compose ps

# Access backend container
docker-compose exec notification-service sh

# Access database
docker-compose exec mongo mongo -u admin -p

# View logs
docker-compose logs notification-service
docker-compose logs admin-dashboard
docker-compose logs mongo
```

## Service Details

### Frontend Service
- **Image**: Custom Nginx-based React app
- **Port**: 3001 (external) → 80 (internal)
- **Features**:
  - Gzip compression
  - Static asset caching
  - API request proxying
  - WebSocket proxying
  - Security headers

### Backend Service
- **Image**: Custom Node.js with TypeScript
- **Ports**: 3000 (API), 3002 (WebSocket)
- **Features**:
  - Health checks
  - Persistent volumes for sessions/logs
  - Security hardening
  - Multi-stage build optimization

### Database Service
- **Image**: MongoDB 7
- **Port**: 27017
- **Features**:
  - Health checks
  - Persistent data volumes
  - Authentication enabled
  - Automatic initialization

### Admin Interface
- **Image**: Mongo Express
- **Port**: 8081
- **Features**:
  - Web-based MongoDB admin
  - Collection browsing
  - Query execution
  - Index management

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :3000 -i :3001 -i :27017

   # Change ports in docker-compose.yml if needed
   ports:
     - "3000:3000"  # host:container
   ```

2. **Permission Issues**
   ```bash
   # Fix volume permissions
   sudo chown -R $USER:$USER sessions/ logs/
   ```

3. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   # Docker Desktop: Settings → Resources → Memory
   ```

4. **Build Failures**
   ```bash
   # Clean rebuild
   docker-compose down --volumes --remove-orphans
   docker-compose up --build --force-recreate
   ```

### Health Checks

All services include health checks. Check status:

```bash
docker-compose ps
```

Look for "healthy" status in the STATUS column.

### Logs and Debugging

```bash
# All logs
docker-compose logs

# Specific service logs
docker-compose logs notification-service

# Follow logs
docker-compose logs -f admin-dashboard

# Last 100 lines
docker-compose logs --tail=100 mongo
```

## Development Workflow

### Local Development with Docker

1. **Backend Development**:
   ```bash
   # Run only database
   docker-compose up mongo mongo-express

   # Run backend locally
   npm run dev
   ```

2. **Frontend Development**:
   ```bash
   # Run only backend and database
   docker-compose up notification-service mongo

   # Run frontend locally
   cd admin-dashboard
   npm run dev
   ```

### Production Deployment

1. **Build optimized images**:
   ```bash
   docker-compose build --no-cache
   ```

2. **Deploy with environment variables**:
   ```bash
   # Set production environment
   export NODE_ENV=production

   # Deploy
   docker-compose up -d
   ```

3. **Monitor and scale**:
   ```bash
   # Check resource usage
   docker stats

   # Scale if needed
   docker-compose up -d --scale notification-service=3
   ```

## Security Considerations

### Production Setup

1. **Strong Secrets**: Use long, random strings for JWT secrets
2. **Network Security**: Configure firewall rules
3. **SSL/TLS**: Add SSL termination (nginx, load balancer)
4. **Regular Updates**: Keep Docker images updated
5. **Backup Strategy**: Regular database backups

### Environment Variables

Never commit sensitive values to version control. Use:
- `.env` files (add to `.gitignore`)
- Docker secrets
- Environment-specific configuration

## Performance Optimization

### Frontend Optimizations
- Static asset caching (1 year)
- Gzip compression
- CDN integration possible

### Backend Optimizations
- Multi-stage Docker builds
- Health checks for reliability
- Connection pooling for database

### Database Optimizations
- Persistent volumes for data
- Index optimization
- Connection limits

## Backup and Restore

### Database Backup
```bash
# Create backup
docker-compose exec mongo mongodump \
  --username admin \
  --password $MONGO_ROOT_PASSWORD \
  --db notification-service \
  --out /backup

# Copy from container
docker cp $(docker-compose ps -q mongo):/backup ./backup
```

### Database Restore
```bash
# Copy to container
docker cp ./backup $(docker-compose ps -q mongo):/backup

# Restore
docker-compose exec mongo mongorestore \
  --username admin \
  --password $MONGO_ROOT_PASSWORD \
  /backup
```

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Ensure all prerequisites are installed
4. Check port availability
