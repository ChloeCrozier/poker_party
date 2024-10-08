const Deck = require('./deck');
const Player = require('./player');

const handRankings = {
    'highCard': 1,
    'onePair': 2,
    'twoPair': 3,
    'threeOfAKind': 4,
    'straight': 5,
    'flush': 6,
    'fullHouse': 7,
    'fourOfAKind': 8,
    'straightFlush': 9,
    'royalFlush': 10,
};

function evaluateHand(cards) {
    const sortedCards = cards.sort((a, b) => b.rank - a.rank);
    const bestHand = {
        rank: handRankings['highCard'],
        cards: sortedCards.slice(0, 5),
    };
    return bestHand;
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
            player.folded = false;
        });

        console.log(`\nStarting new round...`);
        console.log(`\nPot: ${this.pot} chips\n`);

        this.players.forEach(player => {
            console.log(`${player.name}'s cards:`, player.hand);
        });

        this.collectBlinds();
    }

    bettingRound(startingPlayerIndex) {
        let currentIndex = startingPlayerIndex;
        let highestBet = this.bigBlind;
        let playersInRound = this.players.length;
        let lastRaiserIndex = -1;
        let hasRaised = false;

        while (true) {
            let player = this.players[currentIndex];
            if (player.folded) {
                currentIndex = this.nextPlayer(currentIndex);
                if (currentIndex === startingPlayerIndex) break;
                continue;
            }

            let amountToCall = highestBet - player.currentBet;
            if (amountToCall < 0) amountToCall = 0;

            console.log(`${player.name}'s turn. Current bet to call: ${amountToCall} chips.`);

            if (amountToCall > 0) {
                if (Math.random() < 0.5) {
                    console.log(`${player.name} folds.`);
                    player.fold();
                    playersInRound--;
                    if (playersInRound === 1) return false;
                } else {
                    player.bet(amountToCall);
                    this.pot += amountToCall;
                    console.log(`${player.name} calls with ${amountToCall} chips.`);
                }
            } else {
                if (Math.random() < 0.5) {
                    let raiseAmount = Math.floor(Math.random() * 10);
                    if (raiseAmount > 0) {
                        player.bet(raiseAmount);
                        this.pot += raiseAmount;
                        highestBet += raiseAmount;
                        lastRaiserIndex = currentIndex;
                        hasRaised = true;
                        console.log(`${player.name} raises by ${raiseAmount} chips.`);
                    } else {
                        console.log(`${player.name} checks.`);
                    }
                } else {
                    console.log(`${player.name} checks.`);
                }
            }
            console.log(`\nPot: ${this.pot} chips\n`);

            currentIndex = this.nextPlayer(currentIndex);
            if (currentIndex === startingPlayerIndex && !hasRaised) break;
            if (hasRaised && currentIndex === lastRaiserIndex) break;
        }
        return true;
    }

    showCommunityCards(round) {
        const cardsToDeal = round === 'flop' ? 3 : 1;
        const newCards = this.deck.deal(cardsToDeal);
        this.communityCards.push(...newCards);
        console.log(`${round.charAt(0).toUpperCase() + round.slice(1)} dealt:`, this.communityCards);
    }

    checkForWin() {
        const activePlayers = this.players.filter(player => !player.folded);
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            winner.chips += this.pot;
            console.log(`${winner.name} wins the pot of ${this.pot} chips since the rest folded!`);
            this.pot = 0;
            return true;
        }
        return false;
    }

    determineWinner() {
        const remainingPlayers = this.players.filter(player => !player.folded);
        const communityCards = this.communityCards;

        let bestHand = null;
        let winner = null;

        remainingPlayers.forEach(player => {
            const playerCards = player.hand.concat(communityCards);
            const playerBestHand = evaluateHand(playerCards);

            if (!bestHand || playerBestHand.rank > bestHand.rank) {
                bestHand = playerBestHand;
                winner = player;
            } else if (playerBestHand.rank === bestHand.rank) {
                if (this.breakTie(playerBestHand.cards, bestHand.cards)) {
                    winner = player;
                }
            }
        });

        winner.chips += this.pot;
        console.log(`${winner.name} wins the pot of ${this.pot} chips with a ${this.getHandName(bestHand.rank)}!`);
        this.pot = 0;
    }

    breakTie(player1Cards, player2Cards) {
        for (let i = 0; i < 5; i++) {
            if (player1Cards[i].rank > player2Cards[i].rank) return true;
            if (player1Cards[i].rank < player2Cards[i].rank) return false;
        }
        return false;
    }

    getHandName(rank) {
        for (const [name, value] of Object.entries(handRankings)) {
            if (value === rank) return name;
        }
        return 'unknown hand';
    }

    play() {
        this.startNewRound();
        if (this.checkForWin()) return;

        let smallBlindPlayer = this.nextPlayer(this.dealerIndex);
        let bigBlindPlayer = this.nextPlayer(smallBlindPlayer);

        if (!this.bettingRound(this.nextPlayer(bigBlindPlayer))) {
            this.determineWinner();
            return;
        }

        console.log('\n--- Round: Flop ---\n');
        this.showCommunityCards('flop');
        if (this.checkForWin()) return;
        if (!this.bettingRound(this.nextPlayer(this.dealerIndex))) {
            this.determineWinner();
            return;
        }

        console.log('\n--- Round: Turn ---\n');
        this.showCommunityCards('turn');
        if (this.checkForWin()) return;
        if (!this.bettingRound(this.nextPlayer(this.dealerIndex))) {
            this.determineWinner();
            return;
        }

        console.log('\n--- Round: River ---\n');
        this.showCommunityCards('river');
        if (this.checkForWin()) return;
        this.bettingRound(this.nextPlayer(this.dealerIndex));
        this.determineWinner();
    }
}

module.exports = PokerGame;
