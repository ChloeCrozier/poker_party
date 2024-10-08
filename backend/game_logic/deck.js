const Card = require('./card');

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

module.exports = Deck;
