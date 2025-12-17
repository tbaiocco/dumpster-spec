#!/bin/bash

# Script to test Railway deployment configuration locally
# This builds the production Docker image and runs basic checks

set -e

echo "🔍 Testing Railway Deployment Configuration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from backend directory${NC}"
    exit 1
fi

echo "1️⃣ Checking Dockerfile.prod..."
if [ ! -f "Dockerfile.prod" ]; then
    echo -e "${RED}❌ Dockerfile.prod not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dockerfile.prod exists${NC}"

echo ""
echo "2️⃣ Checking .dockerignore..."
if [ ! -f ".dockerignore" ]; then
    echo -e "${YELLOW}⚠️  .dockerignore not found (optional but recommended)${NC}"
else
    echo -e "${GREEN}✅ .dockerignore exists${NC}"
fi

echo ""
echo "3️⃣ Building production Docker image..."
docker build -f Dockerfile.prod -t dumpster-backend-test:latest . || {
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Docker build successful${NC}"

echo ""
echo "4️⃣ Checking image size..."
IMAGE_SIZE=$(docker images dumpster-backend-test:latest --format "{{.Size}}")
echo -e "   Image size: ${YELLOW}${IMAGE_SIZE}${NC}"

echo ""
echo "5️⃣ Inspecting image layers..."
docker history dumpster-backend-test:latest --human --format "table {{.Size}}\t{{.CreatedBy}}" | head -10

echo ""
echo "6️⃣ Checking if health endpoint would work..."
echo "   (This requires the full app to be running with database)"
echo "   Manual test: docker run -p 3000:3000 --env-file .env dumpster-backend-test:latest"

echo ""
echo "7️⃣ Verifying Google Cloud config handler..."
if [ -f "src/config/google-cloud.config.ts" ]; then
    echo -e "${GREEN}✅ Google Cloud config handler exists${NC}"
else
    echo -e "${YELLOW}⚠️  Google Cloud config handler not found${NC}"
fi

echo ""
echo "8️⃣ Checking for credentials encoding script..."
if [ -f "scripts/encode-google-credentials.sh" ]; then
    echo -e "${GREEN}✅ Credentials encoding script exists${NC}"
else
    echo -e "${YELLOW}⚠️  Credentials encoding script not found${NC}"
fi

echo ""
echo -e "${GREEN}✅ All basic checks passed!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Test the image locally: docker run -p 3000:3000 --env-file .env dumpster-backend-test:latest"
echo "   2. Deploy to Railway following docs/RAILWAY_QUICKSTART.md"
echo ""
echo "🧹 Cleanup: docker rmi dumpster-backend-test:latest"
