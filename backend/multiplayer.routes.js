const express = require("express");
const router = express.Router();
require("dotenv").config();
const mongoose = require("mongoose");

const GameRoom = require("./models/GameRoom");

router.post("/createRoom", async (req, res) => {
  const { playerName, buyIn, isProtected, password } = req.body;

  const newRoom = new GameRoom({
    roomCode: 223456,
    players: [
      { name: playerName, balance: buyIn, isTurn: true, hasFolded: false },
    ],
    maxPlayers: 6,
    currentPot: 0,
    currentBet: 0,
    currentRound: 1,
    currentPlayer: playerName,
  });

  newRoom
    .save()
    .then(console.log(`${playerName} created a room`))
    .catch((err) => {
      console.error("Failed to create room", err);
    });

  res.send({ message: "success" }).status(200);
});

module.exports = router;
