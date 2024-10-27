const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;
const verifyAction = require("./middleware/verifyAction");

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Example route for placing a bet
router.put("/:roomCode/bet", verifyAction, async (req, res) => {
  console.log("example route");

  try {
    const { roomCode } = req.params;
    const { betAmount, playerID } = req.body; // Assuming bet details are in req.body

    // Placeholder for game logic
    // Example: Store the bet in MongoDB
    const Bet = mongoose.model("Bet", new mongoose.Schema({ roomCode: String, playerID: String, betAmount: Number }));
    const newBet = new Bet({ roomCode, playerID, betAmount });
    await newBet.save();

    res.status(200).json({ message: "Bet placed successfully" });
  } catch (error) {
    console.error("Error placing bet:", error);
    res.status(500).json({ error: "An error occurred while placing the bet" });
  }
});

module.exports = router;
