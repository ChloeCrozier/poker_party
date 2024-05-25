class Card {
  constructor(suit, value) {
    this.suit = suit;
    this.value = value;
  }
}

class Deck {
  constructor() {
    this.suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    this.values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
    this.cards = [];
    this.initializeDeck();
    this.shuffle();
  }

  initializeDeck() {
    this.cards = [];
    for (let suit of this.suits) {
      for (let value of this.values) {
        this.cards.push(new Card(suit, value));
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(num) {
    return this.cards.splice(0, num);
  }
}

class Player {
  constructor(name, chips) {
    this.name = name;
    this.chips = chips;
    this.hand = [];
    this.currentBet = 0;
  }

  receiveCards(cards) {
    this.hand = cards;
  }

  bet(amount) {
    this.chips -= amount;
    this.currentBet += amount;
  }

  resetBet() {
    this.currentBet = 0;
  }
}

class PokerGame {
  constructor(players, smallBlind, bigBlind) {
    this.players = players;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.pot = 0;
    this.communityCards = [];
    this.deck = new Deck();
    this.dealerIndex = 0;
  }

  nextPlayer(index) {
    return (index + 1) % this.players.length;
  }

  collectBlinds() {
    let smallBlindPlayer = this.nextPlayer(this.dealerIndex);
    let bigBlindPlayer = this.nextPlayer(smallBlindPlayer);

    this.players[smallBlindPlayer].bet(this.smallBlind);
    this.players[bigBlindPlayer].bet(this.bigBlind);

    this.pot += this.smallBlind + this.bigBlind;
    console.log(`${this.players[smallBlindPlayer].name} posts small blind of ${this.smallBlind} chips.`);
    console.log(`${this.players[bigBlindPlayer].name} posts big blind of ${this.bigBlind} chips.`);
  }

  startNewRound() {
    this.communityCards = [];
    this.deck = new Deck();
    this.deck.shuffle();

    this.players.forEach(player => {
      player.receiveCards(this.deck.deal(2));
      player.resetBet();
    });

    console.log(`Starting new round...`);
    this.players.forEach(player => {
      console.log(`${player.name} is dealt:`, player.hand);
    });

    this.collectBlinds();
  }

  bettingRound(startingPlayerIndex) {
    let currentIndex = startingPlayerIndex;
    let lastRaise = 0;
    let playersInRound = this.players.length;

    while (true) {
      let player = this.players[currentIndex];
      console.log(`${player.name}'s turn. Current bet to call: ${lastRaise} chips.`);

      if (player.currentBet < lastRaise) {
        if (Math.random() < 0.5) { // Randomly decide to fold or call
          console.log(`${player.name} folds.`);
          playersInRound--;
          if (playersInRound === 1) return false; // Round ends if only one player remains
        } else {
          let callAmount = lastRaise - player.currentBet;
          player.bet(callAmount);
          this.pot += callAmount;
          console.log(`${player.name} calls with ${callAmount} chips.`);
        }
      } else {
        let raiseAmount = Math.floor(Math.random() * 10); // Random raise amount
        player.bet(raiseAmount);
        this.pot += raiseAmount;
        lastRaise += raiseAmount;
        console.log(`${player.name} raises by ${raiseAmount} chips.`);
      }

      currentIndex = this.nextPlayer(currentIndex);
      if (currentIndex === startingPlayerIndex) break; // End round after going full circle
    }
    return true; // Betting round completed with more than one player
  }

  showCommunityCards(round) {
    const cardsToDeal = round === 'flop' ? 3 : 1;
    const newCards = this.deck.deal(cardsToDeal);
    this.communityCards.push(...newCards);
    console.log(`${round.charAt(0).toUpperCase() + round.slice(1)} dealt:`, this.communityCards);
  }

  determineWinner() {
    // Simplified winner determination
    let remainingPlayers = this.players.filter(player => player.currentBet > 0);
    if (remainingPlayers.length === 1) {
      console.log(`${remainingPlayers[0].name} wins the pot of ${this.pot} chips since the rest folded!`);
    } else {
      // For simplicity, we'll randomly choose a winner among the remaining players
      let winner = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];
      console.log(`${winner.name} wins the pot of ${this.pot} chips!`);
    }
    this.pot = 0; // Reset pot for the next round
  }

  play() {
    this.startNewRound();
    let smallBlindPlayer = this.nextPlayer(this.dealerIndex);
    let bigBlindPlayer = this.nextPlayer(smallBlindPlayer);

    if (!this.bettingRound(this.nextPlayer(bigBlindPlayer))) {
      this.determineWinner();
      return;
    }

    this.showCommunityCards('flop');
    if (!this.bettingRound(this.nextPlayer(this.dealerIndex))) {
      this.determineWinner();
      return;
    }

    this.showCommunityCards('turn');
    if (!this.bettingRound(this.nextPlayer(this.dealerIndex))) {
      this.determineWinner();
      return;
    }

    this.showCommunityCards('river');
    this.bettingRound(this.nextPlayer(this.dealerIndex));
    this.determineWinner();
  }
}

const players = [new Player('Alice', 100), new Player('Bob', 100)];
const game = new PokerGame(players, 1, 2);

game.play();