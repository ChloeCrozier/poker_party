const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");

// grab mongo uri from env
require("dotenv").config();
const MONGO_URI = process.env.MONGO_URI;

const verifyAction = require("./middleware/verifyAction");

// This is an example route for placing a bet
// Here our middleware verifyAction will ensure the request being made to this route is valid
router.put("/:roomCode/bet", async (req, res) => {
  console.log("example route");
  // here is where we will implement game logic, we can make use of our previous code,
  // however instead of printing to our console, the outputs at each round will be sent to mongodb
  // make use of the mongoURI & mongoose package to interact with our deployed mongodb cluster
});

module.exports = router;
