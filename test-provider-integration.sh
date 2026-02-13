#!/bin/bash

echo "=========================================="
echo "Multi-Provider AI Integration Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check if backend is running
echo -e "${BLUE}Test 1: Backend Health Check${NC}"
HEALTH=$(curl -s http://localhost:3001/api/v1/health)
if echo "$HEALTH" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✅ Backend is running${NC}"
else
  echo -e "${RED}❌ Backend is not running${NC}"
  exit 1
fi
echo ""

# Test 2: Check AI Providers endpoint
echo -e "${BLUE}Test 2: AI Providers Endpoint${NC}"
PROVIDERS=$(curl -s http://localhost:3001/api/v1/projects/ai-providers)
if echo "$PROVIDERS" | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✅ AI Providers endpoint working${NC}"
  PROVIDER_COUNT=$(echo "$PROVIDERS" | jq '.data | length')
  echo "   Found $PROVIDER_COUNT provider(s)"
  echo "$PROVIDERS" | jq '.data[] | {name: .name, display_name: .display_name, is_default: .is_default}'
else
  echo -e "${RED}❌ AI Providers endpoint failed${NC}"
  echo "$PROVIDERS" | jq '.'
  exit 1
fi
echo ""

# Test 3: Check default provider
echo -e "${BLUE}Test 3: Default Provider${NC}"
DEFAULT=$(echo "$PROVIDERS" | jq '.data[] | select(.is_default == true)')
if [ -n "$DEFAULT" ]; then
  echo -e "${GREEN}✅ Default provider found${NC}"
  echo "$DEFAULT" | jq '{name: .name, display_name: .display_name, model: .config.default_model}'
else
  echo -e "${RED}❌ No default provider configured${NC}"
fi
echo ""

# Test 4: Check frontend is accessible
echo -e "${BLUE}Test 4: Frontend Access${NC}"
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
if [ "$FRONTEND" = "200" ]; then
  echo -e "${GREEN}✅ Frontend is running on http://localhost:5173${NC}"
else
  echo -e "${RED}❌ Frontend is not accessible (HTTP $FRONTEND)${NC}"
fi
echo ""

# Test 5: Check service files exist
echo -e "${BLUE}Test 5: Integration Files Check${NC}"
FILES=(
  "services/ai-providers.service.ts"
  "lib/ai-multi-provider.ts"
  "components/product-generator/ProviderSelector.tsx"
  "backend/src/routes/ai-providers.routes.ts"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ $file${NC}"
  else
    echo -e "${RED}❌ $file (missing)${NC}"
    ALL_EXIST=false
  fi
done
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}Test Summary${NC}"
echo "=========================================="
echo ""
echo "🎯 Backend API: http://localhost:3001"
echo "🎯 Frontend UI: http://localhost:5173"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Navigate to Products → Create New Product"
echo "3. Look for 'AI Provider' dropdown in the input step"
echo "4. If only 1 provider (SAIF AI), dropdown will be hidden"
echo "5. To test multiple providers, add more via Admin Portal"
echo ""
echo -e "${BLUE}To add more providers:${NC}"
echo "1. Access admin portal (setup required)"
echo "2. Or manually insert via SQL:"
echo "   docker exec -it infinia-postgres psql -U infinia -d infinia_system"
echo ""
