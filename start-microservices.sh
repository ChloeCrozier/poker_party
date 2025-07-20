#!/bin/bash

echo "Starting Poker Party Microservices..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running (optional check)
if ! command -v mongod &> /dev/null; then
    echo "WARNING: MongoDB not found locally. Make sure you have MongoDB Atlas configured."
fi

# Create .env files if they don't exist
createEnvFile() {
    local service=$1
    local port=$2
    local envFile="services/$service/.env"
    
    if [ ! -f "$envFile" ]; then
        echo "Creating .env for $service..."
        mkdir -p "services/$service"
        cat > "$envFile" << EOF
MONGO_URI=mongodb://localhost:27017/poker_party
${service^^}_PORT=$port
EOF
        echo "Created $envFile"
    fi
}

# Create environment files
createEnvFile "data-service" "3001"
createEnvFile "game-service" "3002"
createEnvFile "gateway" "3000"

# Add service URLs to .env files
echo "DATA_SERVICE_URL=http://localhost:3001" >> services/game-service/.env
echo "GAME_SERVICE_URL=http://localhost:3002" >> services/gateway/.env
echo "DATA_SERVICE_URL=http://localhost:3001" >> services/gateway/.env

# Install dependencies for each service
installDependencies() {
    local service=$1
    echo "Installing dependencies for $service..."
    cd "services/$service"
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    cd ../..
}

installDependencies "data-service"
installDependencies "game-service"
installDependencies "gateway"

echo ""
echo "Starting microservices..."
echo "   Data Service: http://localhost:3001"
echo "   Game Service: http://localhost:3002"
echo "   Gateway: http://localhost:3000"
echo "   Frontend: Open client/index.html in your browser"
echo ""

# Start services in background
echo "Starting Data Service..."
cd services/data-service
npm start &
DATA_PID=$!
cd ../..

echo "Starting Game Service..."
cd services/game-service
npm start &
GAME_PID=$!
cd ../..

echo "Starting Gateway..."
cd services/gateway
npm start &
GATEWAY_PID=$!
cd ../..

echo "All services started!"
echo "   Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $DATA_PID 2>/dev/null
    kill $GAME_PID 2>/dev/null
    kill $GATEWAY_PID 2>/dev/null
    echo "Services stopped"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT

# Wait for all background processes
wait 