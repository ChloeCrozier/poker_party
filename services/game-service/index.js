const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.GAME_SERVICE_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3001';

// Poker game logic
class PokerGame {
    constructor() {
        this.handRankings = {
            'highCard': 1,
            'onePair': 2,
            'twoPair': 3,
            'threeOfAKind': 4,
            'straight': 5,
            'flush': 6,
            'fullHouse': 7,
            'fourOfAKind': 8,
            'straightFlush': 9,
            'royalFlush': 10
        };
    }

    // Process player action
    async processAction(roomCode, playerId, action, amount = 0) {
        try {
            // Get current game state
            const gameResponse = await axios.get(`${DATA_SERVICE_URL}/rooms/${roomCode}`);
            if (!gameResponse.data.success) {
                throw new Error('Failed to get game state');
            }

            const gameRoom = gameResponse.data.gameState;
            const player = gameRoom.players.find(p => p.id === playerId);

            if (!player) {
                throw new Error('Player not found');
            }

            if (gameRoom.gameState.currentPlayerIndex !== gameRoom.players.indexOf(player)) {
                throw new Error('Not your turn');
            }

            let result;
            switch (action) {
                case 'fold':
                    result = this.fold(gameRoom, playerId);
                    break;
                case 'check':
                    result = this.check(gameRoom, playerId);
                    break;
                case 'call':
                    result = this.call(gameRoom, playerId);
                    break;
                case 'raise':
                    result = this.raise(gameRoom, playerId, amount);
                    break;
                default:
                    throw new Error('Invalid action');
            }

            // Update game state
            await axios.put(`${DATA_SERVICE_URL}/rooms/${roomCode}/gameState`, {
                gameState: gameRoom.gameState
            });

            return result;

        } catch (error) {
            throw new Error(`Game action failed: ${error.message}`);
        }
    }

    fold(gameRoom, playerId) {
        const player = gameRoom.players.find(p => p.id === playerId);
        player.folded = true;

        this.addGameLog(gameRoom, `${player.name} folds`, playerId);

        // Check if only one player remains
        const activePlayers = gameRoom.players.filter(p => !p.folded);
        if (activePlayers.length === 1) {
            this.endRound(gameRoom, activePlayers[0]);
            return { action: 'fold', gameOver: true, winner: activePlayers[0] };
        }

        this.moveToNextPlayer(gameRoom);
        return { action: 'fold', gameOver: false };
    }

    check(gameRoom, playerId) {
        const player = gameRoom.players.find(p => p.id === playerId);
        const amountToCall = gameRoom.gameState.currentBet - player.currentBet;

        if (amountToCall > 0) {
            throw new Error('Cannot check when there is a bet to call');
        }

        this.addGameLog(gameRoom, `${player.name} checks`, playerId);
        this.moveToNextPlayer(gameRoom);
        return { action: 'check' };
    }

    call(gameRoom, playerId) {
        const player = gameRoom.players.find(p => p.id === playerId);
        const amountToCall = gameRoom.gameState.currentBet - player.currentBet;

        if (amountToCall <= 0) {
            throw new Error('No bet to call');
        }

        if (player.balance < amountToCall) {
            // All-in
            const allInAmount = player.balance;
            player.currentBet += allInAmount;
            player.totalBet += allInAmount;
            player.balance = 0;
            gameRoom.gameState.pot += allInAmount;
            this.addGameLog(gameRoom, `${player.name} calls all-in with $${allInAmount}`, playerId);
        } else {
            player.currentBet += amountToCall;
            player.totalBet += amountToCall;
            player.balance -= amountToCall;
            gameRoom.gameState.pot += amountToCall;
            this.addGameLog(gameRoom, `${player.name} calls $${amountToCall}`, playerId);
        }

        this.moveToNextPlayer(gameRoom);
        return { action: 'call', amount: amountToCall };
    }

    raise(gameRoom, playerId, amount) {
        const player = gameRoom.players.find(p => p.id === playerId);
        const currentBet = gameRoom.gameState.currentBet;
        const playerBet = player.currentBet;
        const minRaise = currentBet + gameRoom.bigBlind;
        const totalAmount = playerBet + amount;

        if (totalAmount < minRaise) {
            throw new Error(`Raise must be at least $${minRaise - playerBet}`);
        }

        if (player.balance < amount) {
            throw new Error('Insufficient balance');
        }

        player.currentBet = totalAmount;
        player.totalBet += amount;
        player.balance -= amount;
        gameRoom.gameState.pot += amount;
        gameRoom.gameState.currentBet = totalAmount;
        gameRoom.gameState.lastRaiserIndex = gameRoom.players.indexOf(player);

        this.addGameLog(gameRoom, `${player.name} raises to $${totalAmount}`, playerId);
        this.moveToNextPlayer(gameRoom);
        return { action: 'raise', amount, newBet: totalAmount };
    }

    moveToNextPlayer(gameRoom) {
        let nextIndex = this.getNextPlayerIndex(gameRoom.gameState.currentPlayerIndex, gameRoom.players.length);
        let rounds = 0;
        const maxRounds = gameRoom.players.length;

        while (rounds < maxRounds) {
            const nextPlayer = gameRoom.players[nextIndex];
            if (!nextPlayer.folded && nextPlayer.isActive) {
                // Check if betting round is complete
                if (this.isBettingRoundComplete(gameRoom)) {
                    this.advanceGamePhase(gameRoom);
                    return;
                }

                // Check if we've gone around to the last raiser
                if (gameRoom.gameState.lastRaiserIndex !== -1 &&
                    nextIndex === gameRoom.gameState.lastRaiserIndex) {
                    this.advanceGamePhase(gameRoom);
                    return;
                }

                gameRoom.gameState.currentPlayerIndex = nextIndex;
                return;
            }
            nextIndex = this.getNextPlayerIndex(nextIndex, gameRoom.players.length);
            rounds++;
        }
    }

    isBettingRoundComplete(gameRoom) {
        const activePlayers = gameRoom.players.filter(p => !p.folded && p.isActive);
        if (activePlayers.length <= 1) return true;

        const currentBet = gameRoom.gameState.currentBet;
        return activePlayers.every(player =>
            player.currentBet === currentBet || player.folded
        );
    }

    advanceGamePhase(gameRoom) {
        const currentPhase = gameRoom.gameState.phase;

        switch (currentPhase) {
            case 'preflop':
                this.dealFlop(gameRoom);
                break;
            case 'flop':
                this.dealTurn(gameRoom);
                break;
            case 'turn':
                this.dealRiver(gameRoom);
                break;
            case 'river':
                this.showdown(gameRoom);
                break;
        }
    }

    dealFlop(gameRoom) {
        gameRoom.gameState.phase = 'flop';
        gameRoom.gameState.communityCards = [
            gameRoom.gameState.deck.pop(),
            gameRoom.gameState.deck.pop(),
            gameRoom.gameState.deck.pop()
        ];

        // Reset betting
        gameRoom.gameState.currentBet = 0;
        gameRoom.gameState.lastRaiserIndex = -1;
        gameRoom.players.forEach(player => {
            player.currentBet = 0;
        });

        // Set first to act (small blind or first active player after dealer)
        gameRoom.gameState.currentPlayerIndex = this.getNextPlayerIndex(gameRoom.gameState.dealerIndex, gameRoom.players.length);

        this.addGameLog(gameRoom, `Flop: ${gameRoom.gameState.communityCards.join(', ')}`);
    }

    dealTurn(gameRoom) {
        gameRoom.gameState.phase = 'turn';
        gameRoom.gameState.communityCards.push(gameRoom.gameState.deck.pop());

        // Reset betting
        gameRoom.gameState.currentBet = 0;
        gameRoom.gameState.lastRaiserIndex = -1;
        gameRoom.players.forEach(player => {
            player.currentBet = 0;
        });

        // Set first to act
        gameRoom.gameState.currentPlayerIndex = this.getNextPlayerIndex(gameRoom.gameState.dealerIndex, gameRoom.players.length);

        this.addGameLog(gameRoom, `Turn: ${gameRoom.gameState.communityCards[3]}`);
    }

    dealRiver(gameRoom) {
        gameRoom.gameState.phase = 'river';
        gameRoom.gameState.communityCards.push(gameRoom.gameState.deck.pop());

        // Reset betting
        gameRoom.gameState.currentBet = 0;
        gameRoom.gameState.lastRaiserIndex = -1;
        gameRoom.players.forEach(player => {
            player.currentBet = 0;
        });

        // Set first to act
        gameRoom.gameState.currentPlayerIndex = this.getNextPlayerIndex(gameRoom.gameState.dealerIndex, gameRoom.players.length);

        this.addGameLog(gameRoom, `River: ${gameRoom.gameState.communityCards[4]}`);
    }

    showdown(gameRoom) {
        gameRoom.gameState.phase = 'showdown';

        const activePlayers = gameRoom.players.filter(p => !p.folded);
        if (activePlayers.length === 1) {
            this.endRound(gameRoom, activePlayers[0]);
            return;
        }

        // Evaluate hands and determine winner
        const winner = this.evaluateHands(activePlayers, gameRoom.gameState.communityCards);
        this.endRound(gameRoom, winner);
    }

    endRound(gameRoom, winner) {
        winner.balance += gameRoom.gameState.pot;
        this.addGameLog(gameRoom, `${winner.name} wins $${gameRoom.gameState.pot}!`);

        // Reset for next round
        gameRoom.gameState.pot = 0;
        gameRoom.gameState.communityCards = [];
        gameRoom.gameState.currentBet = 0;
        gameRoom.gameState.lastRaiserIndex = -1;

        // Move dealer button
        gameRoom.gameState.dealerIndex = this.getNextPlayerIndex(gameRoom.gameState.dealerIndex, gameRoom.players.length);

        // Reset players
        gameRoom.players.forEach(player => {
            player.currentBet = 0;
            player.totalBet = 0;
            player.folded = false;
            player.cards = [];
            player.isSmallBlind = false;
            player.isBigBlind = false;
        });

        // Start new round
        gameRoom.gameState.phase = 'preflop';
        this.assignBlinds(gameRoom);
        this.dealCards(gameRoom);
        gameRoom.gameState.currentPlayerIndex = this.getNextPlayerIndex(gameRoom.gameState.dealerIndex, gameRoom.players.length, 3);

        this.addGameLog(gameRoom, `New round starting. Dealer: ${gameRoom.players[gameRoom.gameState.dealerIndex].name}`);
    }

    assignBlinds(gameRoom) {
        const smallBlindIndex = this.getNextPlayerIndex(gameRoom.gameState.dealerIndex, gameRoom.players.length);
        const bigBlindIndex = this.getNextPlayerIndex(smallBlindIndex, gameRoom.players.length);

        // Assign small blind
        gameRoom.players[smallBlindIndex].isSmallBlind = true;
        gameRoom.players[smallBlindIndex].currentBet = gameRoom.smallBlind;
        gameRoom.players[smallBlindIndex].totalBet = gameRoom.smallBlind;
        gameRoom.players[smallBlindIndex].balance -= gameRoom.smallBlind;

        // Assign big blind
        gameRoom.players[bigBlindIndex].isBigBlind = true;
        gameRoom.players[bigBlindIndex].currentBet = gameRoom.bigBlind;
        gameRoom.players[bigBlindIndex].totalBet = gameRoom.bigBlind;
        gameRoom.players[bigBlindIndex].balance -= gameRoom.bigBlind;

        gameRoom.gameState.pot = gameRoom.smallBlind + gameRoom.bigBlind;
        gameRoom.gameState.currentBet = gameRoom.bigBlind;
    }

    dealCards(gameRoom) {
        const deck = this.createDeck();
        this.shuffleDeck(deck);

        gameRoom.players.forEach(player => {
            player.cards = [deck.pop(), deck.pop()];
        });

        gameRoom.gameState.deck = deck;
    }

    createDeck() {
        const suits = ['S', 'H', 'D', 'C'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        const deck = [];

        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push(rank + suit);
            }
        }

        return deck;
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    evaluateHands(players, communityCards) {
        let bestHand = null;
        let winner = null;

        players.forEach(player => {
            const hand = this.evaluateHand([...player.cards, ...communityCards]);

            if (!bestHand || this.compareHands(hand, bestHand) > 0) {
                bestHand = hand;
                winner = player;
            }
        });

        return winner;
    }

    evaluateHand(cards) {
        // Simplified hand evaluator - returns high card for now
        const sortedCards = cards.sort((a, b) => this.getCardValue(b) - this.getCardValue(a));

        return {
            type: 'highCard',
            cards: sortedCards.slice(0, 5),
            value: this.getCardValue(sortedCards[0])
        };
    }

    getCardValue(card) {
        const rank = card[0];
        const values = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
            'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return values[rank] || 0;
    }

    compareHands(hand1, hand2) {
        return hand1.value - hand2.value;
    }

    getNextPlayerIndex(currentIndex, numPlayers, offset = 1) {
        return (currentIndex + offset) % numPlayers;
    }

    addGameLog(gameRoom, message, playerId = null) {
        gameRoom.gameState.gameLog.push({
            message,
            timestamp: new Date(),
            playerId
        });
    }
}

const pokerGame = new PokerGame();

// API Routes
app.post('/action', async (req, res) => {
    try {
        const { roomCode, playerId, action, amount } = req.body;
        const result = await pokerGame.processAction(roomCode, playerId, action, amount);
        res.json({ success: true, result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'game-service' });
});

app.listen(PORT, () => {
    console.log(`Game service running on port ${PORT}`);
}); 