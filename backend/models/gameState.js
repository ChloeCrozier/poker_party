const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isTurn: { type: Boolean, default: false },
  hasFolded: { type: Boolean, default: false },
});

const gameRoomSchema = new mongoose.Schema({
  roomCode: { type: String, unique: true, required: true },
  players: [playerSchema],
  maxPlayers: { type: Number, default: 6 },
  currentPot: { type: Number, default: 0 },
  currentBet: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  currentRound: { type: Number, default: 1 },
  currentTurnPlayer: { type: String },
});

const GameRoom = mongoose.model("GameRoom", gameRoomSchema);

module.exports = GameRoom;
