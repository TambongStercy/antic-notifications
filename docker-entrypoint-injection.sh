#!/bin/bash
# This would go in your Dockerfile as an entrypoint script

# Replace placeholder URLs in built JavaScript files
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|http://localhost:8000|${API_URL:-http://localhost:3000}|g" {} \;
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|http://localhost:8002|${WEBSOCKET_URL:-http://localhost:3002}|g" {} \;

# Start nginx
nginx -g "daemon off;"