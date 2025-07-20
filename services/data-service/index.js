const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.DATA_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/poker_party', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Simplified Game Room Schema
const gameRoomSchema = new mongoose.Schema({
    roomCode: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    creatorId: { type: String, required: true },
    players: [{
        id: String,
        name: String,
        balance: Number,
        currentBet: { type: Number, default: 0 },
        totalBet: { type: Number, default: 0 },
        folded: { type: Boolean, default: false },
        isDealer: { type: Boolean, default: false },
        isSmallBlind: { type: Boolean, default: false },
        isBigBlind: { type: Boolean, default: false },
        cards: [String],
        joinedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true }
    }],
    gameState: {
        phase: { type: String, enum: ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown'], default: 'waiting' },
        currentPlayerIndex: { type: Number, default: 0 },
        dealerIndex: { type: Number, default: 0 },
        pot: { type: Number, default: 0 },
        currentBet: { type: Number, default: 0 },
        communityCards: [String],
        deck: [String],
        lastRaiserIndex: { type: Number, default: -1 },
        gameLog: [{ message: String, timestamp: { type: Date, default: Date.now }, playerId: String }]
    },
    buyIn: { type: Number, default: 5 },
    smallBlind: { type: Number, default: 0.10 },
    bigBlind: { type: Number, default: 0.20 },
    maxPlayers: { type: Number, default: 8 },
    isActive: { type: Boolean, default: true },
    isStarted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const GameRoom = mongoose.model('GameRoom', gameRoomSchema);

// Generate unique room code
async function generateRoomCode() {
    let roomCode;
    let isUnique = false;

    while (!isUnique) {
        roomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const existingRoom = await GameRoom.findOne({ roomCode });
        if (!existingRoom) {
            isUnique = true;
        }
    }

    return roomCode;
}

// API Routes
app.post('/rooms', async (req, res) => {
    try {
        const { name, buyIn, smallBlind, bigBlind, maxPlayers, creatorName } = req.body;

        const roomCode = await generateRoomCode();
        const creatorId = uuidv4();

        const gameRoom = new GameRoom({
            roomCode,
            name: name || `Poker Room ${roomCode}`,
            creatorId,
            buyIn: buyIn || 5,
            smallBlind: smallBlind || 0.10,
            bigBlind: bigBlind || 0.20,
            maxPlayers: maxPlayers || 8,
            players: [{
                id: creatorId,
                name: creatorName,
                balance: buyIn || 5,
                isDealer: true
            }]
        });

        await gameRoom.save();

        res.json({
            success: true,
            roomCode,
            creatorId,
            gameState: gameRoom
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/rooms/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const gameRoom = await GameRoom.findOne({ roomCode });

        if (!gameRoom) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        res.json({ success: true, gameState: gameRoom });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/rooms/:roomCode/join', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { playerName, buyIn } = req.body;

        const gameRoom = await GameRoom.findOne({ roomCode });
        if (!gameRoom) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        if (gameRoom.isStarted) {
            return res.status(400).json({ success: false, error: 'Game has already started' });
        }

        if (gameRoom.players.length >= gameRoom.maxPlayers) {
            return res.status(400).json({ success: false, error: 'Room is full' });
        }

        const playerId = uuidv4();
        gameRoom.players.push({
            id: playerId,
            name: playerName,
            balance: buyIn || gameRoom.buyIn
        });

        await gameRoom.save();

        res.json({
            success: true,
            playerId,
            gameState: gameRoom
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/rooms/:roomCode/start', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { creatorId } = req.body;

        const gameRoom = await GameRoom.findOne({ roomCode });
        if (!gameRoom) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        if (gameRoom.creatorId !== creatorId) {
            return res.status(403).json({ success: false, error: 'Only creator can start the game' });
        }

        if (gameRoom.players.length < 2) {
            return res.status(400).json({ success: false, error: 'Need at least 2 players' });
        }

        // Initialize game state
        gameRoom.isStarted = true;
        gameRoom.gameState.phase = 'preflop';
        gameRoom.gameState.dealerIndex = 0;
        gameRoom.gameState.currentPlayerIndex = 3; // After big blind

        // Assign blinds
        const smallBlindIndex = 1;
        const bigBlindIndex = 2;

        gameRoom.players[smallBlindIndex].isSmallBlind = true;
        gameRoom.players[smallBlindIndex].currentBet = gameRoom.smallBlind;
        gameRoom.players[smallBlindIndex].totalBet = gameRoom.smallBlind;
        gameRoom.players[smallBlindIndex].balance -= gameRoom.smallBlind;

        gameRoom.players[bigBlindIndex].isBigBlind = true;
        gameRoom.players[bigBlindIndex].currentBet = gameRoom.bigBlind;
        gameRoom.players[bigBlindIndex].totalBet = gameRoom.bigBlind;
        gameRoom.players[bigBlindIndex].balance -= gameRoom.bigBlind;

        gameRoom.gameState.pot = gameRoom.smallBlind + gameRoom.bigBlind;
        gameRoom.gameState.currentBet = gameRoom.bigBlind;

        // Deal cards
        const deck = createDeck();
        shuffleDeck(deck);

        gameRoom.players.forEach(player => {
            player.cards = [deck.pop(), deck.pop()];
        });

        gameRoom.gameState.deck = deck;

        await gameRoom.save();

        res.json({ success: true, gameState: gameRoom });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/rooms/:roomCode/gameState', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { gameState } = req.body;

        const gameRoom = await GameRoom.findOne({ roomCode });
        if (!gameRoom) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        gameRoom.gameState = { ...gameRoom.gameState, ...gameState };
        await gameRoom.save();

        res.json({ success: true, gameState: gameRoom });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper functions
function createDeck() {
    const suits = ['S', 'H', 'D', 'C'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const deck = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(rank + suit);
        }
    }

    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'data-service' });
});

app.listen(PORT, () => {
    console.log(`Data service running on port ${PORT}`);
}); 