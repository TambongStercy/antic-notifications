#!/bin/sh
set -e

# Default MongoDB URI if not provided
DEFAULT_MONGODB_URI="mongodb://host.docker.internal:27017/notification-service"

# Use provided MONGODB_URI or default
MONGODB_URI="${MONGODB_URI:-$DEFAULT_MONGODB_URI}"

# Export the environment variable
export MONGODB_URI

echo "Starting notification service with MONGODB_URI: $MONGODB_URI"

# Execute the main command
exec "$@"
