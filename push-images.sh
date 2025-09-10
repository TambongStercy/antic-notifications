#!/bin/bash

# Push script for uploading images to a Docker registry

set -e  # Exit on any error

# Configuration
IMAGE_PREFIX="antic-notifications"
VERSION=${1:-"latest"}
REGISTRY=${2:-""}

if [ -z "$REGISTRY" ]; then
    echo "Error: Registry prefix is required for pushing images"
    echo "Usage: $0 <version> <registry-prefix>"
    echo "Example: $0 v1.0.0 your-registry.com/"
    exit 1
fi

echo "Pushing ANTIC Notification Service images..."
echo "Version: $VERSION"
echo "Registry: $REGISTRY"
echo "============================================"

# Push backend service
echo "Pushing backend service..."
docker push ${REGISTRY}${IMAGE_PREFIX}-backend:${VERSION}

# Push admin dashboard
echo "Pushing admin dashboard..."
docker push ${REGISTRY}${IMAGE_PREFIX}-admin:${VERSION}

echo "============================================"
echo "Images pushed successfully to registry!"
echo ""
echo "To pull on server:"
echo "docker pull ${REGISTRY}${IMAGE_PREFIX}-backend:${VERSION}"
echo "docker pull ${REGISTRY}${IMAGE_PREFIX}-admin:${VERSION}"