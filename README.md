# Poker Party
Multi-player poker game with microservices architecture

## Architecture

The application is built using a microservices architecture with the following components:

- **Data Service** (Port 3001): Handles database operations and room management
- **Game Service** (Port 3002): Manages poker game logic and rules
- **Gateway Service** (Port 3000): API gateway and WebSocket management
- **Frontend Client**: Modern web interface

## Quick Start

### Option 1: Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# Access the application
open http://localhost
```

### Option 2: Local Development
```bash
# Start microservices
./start-microservices.sh

# Or start manually
cd services/data-service && npm start &
cd services/game-service && npm start &
cd services/gateway && npm start &

# Open client/index.html in your browser
```

## Project Structure

```
poker_party/
├── services/
│   ├── data-service/          # Database and room management
│   │   ├── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── game-service/          # Poker game logic
│   │   ├── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── gateway/               # API gateway and WebSocket
│       ├── index.js
│       ├── package.json
│       └── Dockerfile
├── client/
│   └── index.html             # Frontend interface
├── docker-compose.yml         # Docker orchestration
├── nginx.conf                 # Nginx configuration
├── start-microservices.sh     # Local startup script
└── README.md
```

## Features

- **Room Creation**: Create poker rooms with customizable betting rules
- **Room Codes**: 6-digit unique room codes for easy sharing
- **Real-time Gameplay**: WebSocket-based multiplayer with live updates
- **Texas Hold'em Rules**: Full implementation of 2-card Texas Hold'em
- **Betting System**: Support for blinds, calls, raises, and folds
- **Game Phases**: Preflop, Flop, Turn, River, and Showdown
- **Player Management**: Join/leave rooms, player balances, and turn management

## Game Rules

- **Buy-in**: Configurable starting amount (default: $5)
- **Blinds**: Small blind and big blind amounts (default: $0.10/$0.20)
- **Max Players**: 2-8 players per room
- **Dealer Rotation**: Dealer button moves clockwise after each hand
- **Betting**: Standard poker betting rules with call, raise, fold, and check actions

## API Endpoints

### Gateway Service (Port 3000)
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:roomCode` - Get room information
- `POST /api/rooms/:roomCode/join` - Join a room
- `POST /api/rooms/:roomCode/start` - Start the game

### Data Service (Port 3001)
- `POST /rooms` - Create room
- `GET /rooms/:roomCode` - Get room data
- `POST /rooms/:roomCode/join` - Add player to room
- `POST /rooms/:roomCode/start` - Initialize game
- `PUT /rooms/:roomCode/gameState` - Update game state

### Game Service (Port 3002)
- `POST /action` - Process player actions (fold, check, call, raise)

### WebSocket Events
- `joinRoom` - Join a room via WebSocket
- `playerAction` - Perform game actions
- `leaveRoom` - Leave the room
- `gameState` - Receive updated game state
- `playerJoined` - Notification when player joins
- `playerLeft` - Notification when player leaves
- `gameStarted` - Notification when game starts

## Development

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Docker & Docker Compose (for containerized deployment)

### Environment Variables

#### Data Service
```bash
MONGO_URI=mongodb://localhost:27017/poker_party
DATA_SERVICE_PORT=3001
```

#### Game Service
```bash
DATA_SERVICE_URL=http://localhost:3001
GAME_SERVICE_PORT=3002
```

#### Gateway Service
```bash
DATA_SERVICE_URL=http://localhost:3001
GAME_SERVICE_URL=http://localhost:3002
GATEWAY_PORT=3000
```

### Running Tests
```bash
# Test data service
curl http://localhost:3001/health

# Test game service
curl http://localhost:3002/health

# Test gateway
curl http://localhost:3000/health
```

## Docker Deployment

### Build and Run
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Production Deployment
```bash
# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale game-service=3
```

## Monitoring

### Health Checks
- Data Service: `http://localhost:3001/health`
- Game Service: `http://localhost:3002/health`
- Gateway: `http://localhost:3000/health`

### Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs data-service
docker-compose logs game-service
docker-compose logs gateway
```

## Game Flow

1. **Session Creation**: Room creator sets up game rules
2. **Player Joining**: Players join using room code
3. **Game Start**: Creator starts game when ready
4. **Dealing**: Cards dealt, blinds posted
5. **Betting Rounds**: Multiple rounds of betting
6. **Showdown**: Winner determined, pot awarded
7. **Next Hand**: Dealer rotates, new hand begins

## Future Enhancements

- [ ] Improved hand evaluation algorithm
- [ ] Player avatars and profiles
- [ ] Chat functionality
- [ ] Game history and statistics
- [ ] Tournament mode
- [ ] Mobile-responsive design
- [ ] Sound effects and animations
- [ ] Private rooms with passwords
- [ ] Kubernetes deployment
- [ ] Redis caching layer
- [ ] Message queue for scalability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.