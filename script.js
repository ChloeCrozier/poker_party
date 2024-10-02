// index.js
const Player = require('./player');
const PokerGame = require('./pokerGame');

// Setup players
const players = [
  new Player('Alice', 100),
  new Player('Bob', 100),
  new Player('Charlie', 100)
];

// Initialize the poker game
const game = new PokerGame(players, 1, 2);

// Start the game
game.play();
