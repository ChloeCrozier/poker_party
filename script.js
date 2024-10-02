const Player = require('./player');
const PokerGame = require('./pokerGame');

const players = [
  new Player('Alice', 100),
  new Player('Bob', 100),
  new Player('Charlie', 100)
];

const game = new PokerGame(players, 1, 2);

game.play();
