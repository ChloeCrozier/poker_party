const express = require("express");
const router = express.Router();
require("dotenv").config();
const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGO_URI;

module.exports = router;
