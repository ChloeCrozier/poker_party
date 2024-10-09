const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const app = express();

require("dotenv").config();
const mongoURI = process.env.MONGO_URI;

const gameplayRoutes = require("./gameplay.routes");
const multiplayerRoutes = require("./multiplayer.routes");

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Error connecting to MongoDB Atlas", err));

app.use(express.json());
app.use("/", gameplayRoutes);
app.use("/", multiplayerRoutes);

const server = http.createServer(app);
server.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
