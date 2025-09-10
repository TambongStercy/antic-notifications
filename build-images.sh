#!/bin/bash

# Build script for creating immutable Docker images for the ANTIC Notification Service

set -e  # Exit on any error

# Configuration
IMAGE_PREFIX="antic-notifications"
VERSION=${1:-"latest"}
REGISTRY=${2:-""}  # Optional registry prefix (e.g., "your-registry.com/")

echo "Building ANTIC Notification Service images..."
echo "Version: $VERSION"
echo "Registry: ${REGISTRY:-"local"}"
echo "============================================"

# Build backend service
echo "Building backend service..."
docker build -t ${REGISTRY}${IMAGE_PREFIX}-backend:${VERSION} .

# Build admin dashboard
echo "Building admin dashboard..."
docker build -t ${REGISTRY}${IMAGE_PREFIX}-admin:${VERSION} ./admin-dashboard/

echo "============================================"
echo "Images built successfully:"
echo "- ${REGISTRY}${IMAGE_PREFIX}-backend:${VERSION}"
echo "- ${REGISTRY}${IMAGE_PREFIX}-admin:${VERSION}"
echo ""

# List the built images
echo "Image details:"
docker images | grep ${IMAGE_PREFIX}

echo ""
echo "To run locally, use: docker-compose -f docker-compose.prod.yml up"
echo "To push to registry, use: ./push-images.sh ${VERSION} ${REGISTRY}"