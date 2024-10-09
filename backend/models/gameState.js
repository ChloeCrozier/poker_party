const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isTurn: { type: Boolean, default: false },
  hasFolded: { type: Boolean, default: false },
  balance: { type: Number, required: true, default: 0 },
});

const gameRoomSchema = new mongoose.Schema({
  roomCode: { type: Number, unique: true, required: true },
  players: [playerSchema],
  maxPlayers: { type: Number, default: 6 },
  currentPot: { type: Number, default: 0 },
  currentBet: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  currentRound: { type: Number, default: 1 },
  currentPlayer: { type: String },
});

const GameRoom = mongoose.model("GameRoom", gameRoomSchema);

module.exports = GameRoom;

// {
//     "roomCode": "000001",
//     "players": [
//         { "name": "Player1", "balance": 1000, "isTurn": true, "hasFolded": false },
//         { "name": "Player2", "balance": 950, "isTurn": false, "hasFolded": false },
//         { "name": "Player3", "balance": 900, "isTurn": false, "hasFolded": true }
//     ],
//     "maxPlayers": 6,
//     "currentPot": 100,
//     "currentBet": 100,
//     "createdAt": "2024-10-08T14:20:21.000Z",
//     "currentRound": 1,
//     "currentPlayer": "Player1"
// }
