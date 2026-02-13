#!/bin/bash
# Infinia Products - Quick Deployment Script

set -e  # Exit on error

echo "🚀 Infinia Products - Deployment Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${RED}❗ IMPORTANT: Edit .env file with your configuration before continuing${NC}"
    echo ""
    echo "Required variables:"
    echo "  - MONGODB_URI (MongoDB Atlas connection string)"
    echo "  - POSTGRES_PASSWORD (PostgreSQL password)"
    echo "  - JWT_SECRET (generate with: openssl rand -base64 64)"
    echo "  - ENCRYPTION_KEY (generate with: openssl rand -hex 32)"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if MongoDB URI is set
if grep -q "mongodb+srv://username:password" .env; then
    echo -e "${RED}❌ MongoDB URI not configured${NC}"
    echo "Please update MONGODB_URI in .env file"
    exit 1
fi

# Check if JWT_SECRET is set properly
if grep -q "your_jwt_secret" .env; then
    echo -e "${RED}❌ JWT_SECRET not configured${NC}"
    echo "Generate with: openssl rand -base64 64"
    echo "Then update JWT_SECRET in .env file"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables configured${NC}"
echo ""

# Ask deployment mode
echo "Select deployment mode:"
echo "1) Development (with hot reload)"
echo "2) Production (optimized build)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo ""
        echo "🔧 Starting in DEVELOPMENT mode..."
        echo ""

        # Build containers
        echo "📦 Building containers..."
        docker-compose build

        # Start services
        echo "🚀 Starting services..."
        docker-compose up -d

        # Wait for services to be healthy
        echo "⏳ Waiting for services to be healthy..."
        sleep 10

        # Run migrations
        echo "🗄️  Running database migrations..."
        docker-compose exec -T backend npx node-pg-migrate up || true

        # Seed data
        read -p "Seed database with initial data? (y/n): " seed_choice
        if [ "$seed_choice" = "y" ]; then
            echo "🌱 Seeding database..."
            docker-compose exec -T backend npx tsx src/scripts/seed-postgres.ts
        fi

        echo ""
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo ""
        echo "📍 Services:"
        echo "   Frontend:  http://localhost:3000"
        echo "   Backend:   http://localhost:3001"
        echo "   Admin:     http://localhost:3000/admin"
        echo ""
        echo "🔑 Default admin credentials:"
        echo "   Email:     admin@infinia.app"
        echo "   Password:  (check your seed script)"
        echo ""
        echo "📊 View logs:"
        echo "   docker-compose logs -f"
        echo ""
        echo "🛑 Stop services:"
        echo "   docker-compose down"
        ;;

    2)
        echo ""
        echo "🏭 Starting in PRODUCTION mode..."
        echo ""

        # Build containers
        echo "📦 Building containers..."
        docker-compose -f docker-compose.yml build --no-cache

        # Start services
        echo "🚀 Starting services..."
        docker-compose -f docker-compose.yml up -d

        # Wait for services
        echo "⏳ Waiting for services to be healthy..."
        sleep 15

        # Run migrations
        echo "🗄️  Running database migrations..."
        docker-compose -f docker-compose.yml exec -T backend npx node-pg-migrate up

        # Seed admin data only
        echo "🌱 Seeding admin data..."
        docker-compose -f docker-compose.yml exec -T backend npx tsx src/scripts/seed-postgres.ts

        echo ""
        echo -e "${GREEN}✅ Production deployment complete!${NC}"
        echo ""
        echo "📍 Services:"
        echo "   Frontend:  http://localhost:3000"
        echo "   Backend:   http://localhost:3001"
        echo ""
        echo "🔒 IMPORTANT: Configure SSL/TLS for production!"
        echo "   See DEPLOYMENT-GUIDE.md for SSL setup"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Health check
echo ""
echo "🏥 Running health checks..."
sleep 5

# Check backend
if curl -f http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo -e "   Backend:  ${GREEN}✅ Healthy${NC}"
else
    echo -e "   Backend:  ${RED}❌ Unhealthy${NC}"
    echo "   Check logs: docker-compose logs backend"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "   Frontend: ${GREEN}✅ Healthy${NC}"
else
    echo -e "   Frontend: ${RED}❌ Unhealthy${NC}"
    echo "   Check logs: docker-compose logs frontend"
fi

# Check postgres
if docker-compose exec -T postgres pg_isready -U infinia > /dev/null 2>&1; then
    echo -e "   Postgres: ${GREEN}✅ Healthy${NC}"
else
    echo -e "   Postgres: ${RED}❌ Unhealthy${NC}"
    echo "   Check logs: docker-compose logs postgres"
fi

echo ""
echo "🎉 Deployment finished!"
