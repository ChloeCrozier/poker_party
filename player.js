class Player {
    constructor(name, chips) {
        this.name = name;
        this.chips = chips;
        this.hand = [];
        this.currentBet = 0;
        this.folded = false;
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

    fold() {
        this.folded = true;
    }
}

module.exports = Player;
