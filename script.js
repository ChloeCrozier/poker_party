class Card {
  constructor(suit, value) {
    this.suit = suit;
    this.value = value;
  }
}

class Deck {
  constructor() {
    this.cards = this.createDeck();
    this.shuffle();
  }

  createDeck() {
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
    let deck = [];
    for (let suit of suits) {
      for (let value of values) {
        deck.push(new Card(suit, value));
      }
    }
    return deck;
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawCard() {
    return this.cards.pop();
  }
}


class Player {
  constructor(name, chips) {
    this.name = name;
    this.chips = chips;
    this.hand = [];
    this.currentBet = 0;
    this.actions = ['fold', 'check', 'call', 'raise'];
    this.action = 'check';
  }

  receiveCard(card) {
    this.hand.push(card);
  }
}


class Game {
  constructor() {
    this.deck = new Deck();
    this.players = [];
    this.pot = 0;
    this.dealerCards = [];
    this.currentPlayerIndex = 0;
    this.dealerChipIndex = 0;
    this.littleBlind = 1;
    this.bigBlind = 3;
    this.currentBet = this.bigBlind;
    this.currentRound = 0;
  }

  addPlayer(player) {
    this.players.push(player);
  }

  dealFlop() {
    this.dealerCards.push(this.deck.drawCard());
    this.dealerCards.push(this.deck.drawCard());
    this.dealerCards.push(this.deck.drawCard());
  }

  dealTurn() {
    this.dealerCards.push(this.deck.drawCard());
  }

  dealRiver() {
    this.dealerCards.push(this.deck.drawCard());
  }

  playerBet(player, amount) {
    player.chips -= amount;
    this.pot += amount;
    this.currentBet = amount;
  }

  playerFold(player) {

  }

  playerCheck(player) {
    // ...
  }

  playerCall(player) {
    const amountToCall = this.currentBet - player.currentBet;
    this.playerBet(player, amountToCall);
  }

  playerRaise(player, amount) {
    const totalBet = amount + this.currentBet;
    this.playerBet(player, totalBet);
  }

  nextTurn() {
    if (this.currentRound === 0) {
      if (this.currentPlayerIndex === this.roundStartPlayerIndex) {
        this.currentRound++;
        this.currentPlayerIndex = (this.roundStartPlayerIndex + 1) % this.players.length;
        this.amountToCallFlop = this.bigBlind;
      }
    }
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.players[this.currentPlayerIndex].status === 'folded') {
      // ...
    } else if (this.players[this.currentPlayerIndex].status === 'check') {
      // ...
    } else if (this.players[this.currentPlayerIndex].status === 'call') {
      // ...
    } else if (this.players[this.currentPlayerIndex].status === 'raise') {
      // ...
    } else {
      // invalid
    }
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    currentRound++;
    this.nextTurn();
  }

  startGame() {
    this.deck.shuffle();
    this.dealerCards = [];
    this.currentPlayerIndex = 0;
    this.currentBet = this.amountToCallFlop;

    this.players.forEach(player => {
      player.hand = [this.deck.drawCard(), this.deck.drawCard()];
      player.status = 'active';
      player.currentBet = 0;
    });

    this.dealerChipIndex = (this.dealerChipIndex + 1) % this.players.length;
    let smallBlindIndex = (this.dealerChipIndex + 1) % this.players.length;
    let bigBlindIndex = (this.dealerChipIndex + 2) % this.players.length;

    this.playerBet(this.players[smallBlindIndex], this.littleBlind);
    this.playerBet(this.players[bigBlindIndex], this.bigBlind);

    this.roundStartPlayerIndex = (bigBlindIndex + 1) % this.players.length;
  }
}

const game = new Game();
const player1 = new Player('Alice', 100);
const player2 = new Player('Bob', 100);
game.addPlayer(player1);
game.addPlayer(player2);


// to do
// make logic by turn (eg have player and if player is not foelred, take action to set if the amount to call has changed and see what to change for the pot)
// make logic for blinds
// make logic for when a win happens
// make logic for ties
// make logic for when everyone folds and the last person wins
// make logic for when a player goes all in
// make logic for a game vs a round vs a turn