const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.GATEWAY_PORT || 3000;
const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3001';
const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://localhost:3002';

// Middleware
app.use(cors());
app.use(express.json());

// Store active connections
const activeConnections = new Map();

// API Gateway Routes
app.post('/api/rooms', async (req, res) => {
    try {
        const response = await axios.post(`${DATA_SERVICE_URL}/rooms`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/rooms/:roomCode', async (req, res) => {
    try {
        const response = await axios.get(`${DATA_SERVICE_URL}/rooms/${req.params.roomCode}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/rooms/:roomCode/join', async (req, res) => {
    try {
        const response = await axios.post(`${DATA_SERVICE_URL}/rooms/${req.params.roomCode}/join`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/rooms/:roomCode/start', async (req, res) => {
    try {
        const response = await axios.post(`${DATA_SERVICE_URL}/rooms/${req.params.roomCode}/start`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join room
    socket.on('joinRoom', async ({ roomCode, playerId }) => {
        try {
            // Verify room exists
            const roomResponse = await axios.get(`${DATA_SERVICE_URL}/rooms/${roomCode}`);
            if (!roomResponse.data.success) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            // Join socket room
            socket.join(roomCode);

            // Store connection
            if (!activeConnections.has(roomCode)) {
                activeConnections.set(roomCode, new Map());
            }
            activeConnections.get(roomCode).set(playerId, socket);

            // Send current game state
            const gameState = roomResponse.data.gameState;
            socket.emit('gameState', formatGameState(gameState, playerId));

            // Notify other players
            socket.to(roomCode).emit('playerJoined', {
                playerId,
                playerName: gameState.players.find(p => p.id === playerId)?.name
            });

        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Player actions
    socket.on('playerAction', async ({ roomCode, playerId, action, amount }) => {
        try {
            // Forward to game service
            const response = await axios.post(`${GAME_SERVICE_URL}/action`, {
                roomCode,
                playerId,
                action,
                amount
            });

            if (response.data.success) {
                // Get updated game state
                const roomResponse = await axios.get(`${DATA_SERVICE_URL}/rooms/${roomCode}`);
                const gameState = roomResponse.data.gameState;

                // Broadcast to all players in room
                const roomSockets = activeConnections.get(roomCode);
                if (roomSockets) {
                    roomSockets.forEach((playerSocket, pid) => {
                        const formattedState = formatGameState(gameState, pid);
                        playerSocket.emit('gameState', formattedState);
                    });
                }

                socket.emit('actionResult', response.data.result);
            } else {
                socket.emit('error', { message: response.data.error });
            }

        } catch (error) {
            console.error('Error processing player action:', error);
            socket.emit('error', { message: error.message });
        }
    });

    // Leave room
    socket.on('leaveRoom', ({ roomCode, playerId }) => {
        socket.leave(roomCode);

        const roomConnections = activeConnections.get(roomCode);
        if (roomConnections) {
            roomConnections.delete(playerId);

            // Notify other players
            socket.to(roomCode).emit('playerLeft', { playerId });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        // Clean up connections
        activeConnections.forEach((roomConnections, roomCode) => {
            roomConnections.forEach((playerSocket, playerId) => {
                if (playerSocket.id === socket.id) {
                    roomConnections.delete(playerId);
                    socket.to(roomCode).emit('playerLeft', { playerId });
                }
            });
        });
    });
});

// Format game state for client
function formatGameState(gameState, playerId) {
    return {
        phase: gameState.gameState.phase,
        pot: gameState.gameState.pot,
        currentBet: gameState.gameState.currentBet,
        communityCards: gameState.gameState.communityCards,
        players: gameState.players.map(player => ({
            id: player.id,
            name: player.name,
            balance: player.balance,
            currentBet: player.currentBet,
            totalBet: player.totalBet,
            folded: player.folded,
            isDealer: player.isDealer,
            isSmallBlind: player.isSmallBlind,
            isBigBlind: player.isBigBlind,
            isCurrentPlayer: gameState.players.indexOf(player) === gameState.gameState.currentPlayerIndex,
            cards: player.id === playerId ? player.cards : player.folded ? player.cards : []
        })),
        gameLog: gameState.gameState.gameLog.slice(-10),
        currentPlayerIndex: gameState.gameState.currentPlayerIndex,
        dealerIndex: gameState.gameState.dealerIndex
    };
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'gateway' });
});

server.listen(PORT, () => {
    console.log(`Gateway service running on port ${PORT}`);
}); 