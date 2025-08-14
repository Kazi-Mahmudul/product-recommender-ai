#!/bin/bash

# Build script for all pipeline service images
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY=${REGISTRY:-"localhost:5000"}
TAG=${TAG:-"latest"}
BUILD_ARGS=${BUILD_ARGS:-""}

echo -e "${GREEN}🏗️  Building pipeline service images...${NC}"

# Function to build and tag image
build_image() {
    local service=$1
    local dockerfile=$2
    local context=$3
    local image_name="${REGISTRY}/pipeline-${service}:${TAG}"
    
    echo -e "${YELLOW}Building ${service} service...${NC}"
    
    if docker build ${BUILD_ARGS} -f "${dockerfile}" -t "${image_name}" "${context}"; then
        echo -e "${GREEN}✅ Successfully built ${image_name}${NC}"
        
        # Also tag as latest
        docker tag "${image_name}" "${REGISTRY}/pipeline-${service}:latest"
        
        return 0
    else
        echo -e "${RED}❌ Failed to build ${service} service${NC}"
        return 1
    fi
}

# Build scraper service
build_image "scraper" "pipeline/docker/services/scraper.dockerfile" "."

# Build other services (to be implemented)
# build_image "processor" "pipeline/docker/services/processor.dockerfile" "."
# build_image "sync" "pipeline/docker/services/sync.dockerfile" "."

echo -e "${GREEN}🎉 All images built successfully!${NC}"

# Show built images
echo -e "${YELLOW}Built images:${NC}"
docker images | grep "pipeline-" | head -10

# Optional: Push to registry
if [ "$PUSH_IMAGES" = "true" ]; then
    echo -e "${YELLOW}📤 Pushing images to registry...${NC}"
    docker images --format "table {{.Repository}}:{{.Tag}}" | grep "pipeline-" | while read image; do
        echo "Pushing $image..."
        docker push "$image"
    done
    echo -e "${GREEN}✅ Images pushed to registry${NC}"
fi