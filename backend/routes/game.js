const express = require('express');
const Game = require('../models/Game');
const auth = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Select game mode
router.post('/mode-select', auth, async (req, res) => {
  const { mode } = req.body;
  try {
    let game = await Game.findOne({ userId: req.user.userId, isGameOver: false });
    if (!game) {
      game = new Game({ mode, userId: req.user.userId, currentTurn: 'player1' });
    } else {
      game.mode = mode;
      game.currentTurn = 'player1';
    }
    await game.save();
    res.json({ message: 'Game mode selected', gameId: game._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Store player details
router.post('/player-details', auth, async (req, res) => {
  const { player1, player2 } = req.body;
  try {
    let game = await Game.findOne({ userId: req.user.userId, isGameOver: false });
    if (!game) return res.status(404).json({ message: 'No active game found' });

    game.player1 = player1;
    game.player1.position = 1;

    if (game.mode === 'dual') {
      game.player2 = player2;
      game.player2.position = 1;
    } else if (game.mode === 'single') {
      game.player2 = { name: 'ROBUST', color: '#f79a04ff', position: 1 };
    }

    game.currentTurn = 'player1'; // Always start with player1
    await game.save();

    // --- Transmit data to ESP32 (now includes gameId) ---
    const esp32Url = 'http://192.168.4.1/game-setup'; // ESP32 endpoint
    const payload = {
      mode: game.mode,
      gameId: game._id.toString(), // Send gameId!
      players: [
        { name: game.player1.name, color: game.player1.color },
        { name: game.player2.name, color: game.player2.color }
      ]
    };

    try {
      await axios.post(esp32Url, payload);
    } catch (err) {
      console.error('ESP32 transmission failed:', err.message);
    }

    res.json({ message: 'Player details saved & transmitted', gameId: game._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Snakes and ladders logic
const snakes = { 16: 6, 49: 11, 69: 51, 88: 67, 64: 60, 95: 38, 99: 62 };
const ladders = { 2: 36, 4: 14, 9: 31, 40: 42, 33: 83, 71: 91 };
function applySnakesAndLadders(pos) {
  if (snakes[pos]) return snakes[pos];
  if (ladders[pos]) return ladders[pos];
  return pos;
}

// ESP32 or web: update position
router.post('/update-position/:gameId', async (req, res) => {
  const { dice, player } = req.body;
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game || game.isGameOver) return res.status(404).json({ message: 'Game not found or over' });

    const expectedTurn = player === 1 ? 'player1' : 'player2';
    if (game.currentTurn !== expectedTurn) {
      return res.status(400).json({ message: `It's not ${expectedTurn}'s turn.` });
    }

    let pos = player === 1 ? game.player1.position : game.player2.position;
    pos += dice;
    if (pos > 100) pos = 100 - (pos - 100);
    pos = applySnakesAndLadders(pos);
    if (player === 1) game.player1.position = pos;
    else game.player2.position = pos;

    if (pos === 100) {
      game.winner = player === 1 ? game.player1.name : game.player2.name;
      game.isGameOver = true;
    } else {
      game.currentTurn = game.currentTurn === 'player1' ? 'player2' : 'player1';
    }

    await game.save();
    res.json({ message: 'Position updated', position: pos, winner: game.winner, currentTurn: game.currentTurn });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get game state
router.get('/get-game-state/:gameId', async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    res.json({
      player1: { name: game.player1.name, position: game.player1.position },
      player2: { name: game.player2?.name, position: game.player2?.position },
      winner: game.winner,
      isGameOver: game.isGameOver,
      currentTurn: game.currentTurn,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset game
router.post('/reset-game/:gameId', async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    if (game.player1) game.player1.position = 1;
    if (game.player2) game.player2.position = 1;

    game.winner = null;
    game.isGameOver = false;
    game.currentTurn = 'player1';

    await game.save();
    res.json({ message: 'Game reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD: Play Again endpoint to notify ESP32
router.post('/play-again/:gameId', async (req, res) => {
  try {
    const esp32Url = 'http://192.168.4.1/play-again';
    const payload = { gameId: req.params.gameId }; // if needed
    try {
      await axios.post(esp32Url, payload);
      res.json({ message: 'Play again command sent to ESP32' });
    } catch (err) {
      console.error('Failed to notify ESP32 for play again:', err.message);
      res.status(500).json({ message: 'Failed to notify ESP32' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/end-game/:gameId', async (req, res) => {
  try {
    const esp32Url = 'http://192.168.4.1/end-game';
    const payload = { gameId: req.params.gameId }; // if needed
    try {
      await axios.post(esp32Url, payload);
      res.json({ message: 'End game command sent to ESP32' });
    } catch (err) {
      console.error('Failed to notify ESP32 for end game:', err.message);
      res.status(500).json({ message: 'Failed to notify ESP32' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD: Hardware Reset endpoint from Arduino Mega via ESP32
router.post('/hardware-reset/:gameId', async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    // Reset game to initial state (same as reset-game but from hardware)
    if (game.player1) game.player1.position = 1;
    if (game.player2) game.player2.position = 1;

    game.winner = null;
    game.isGameOver = false;
    game.currentTurn = 'player1';

    await game.save();
    
    console.log(`🔄 Hardware reset received for game ${req.params.gameId}`);
    res.json({ 
      message: 'Game reset by hardware successfully',
      resetSource: 'arduino_mega',
      gameState: {
        player1: { name: game.player1.name, position: game.player1.position },
        player2: { name: game.player2?.name, position: game.player2?.position },
        winner: game.winner,
        isGameOver: game.isGameOver,
        currentTurn: game.currentTurn,
      }
    });
  } catch (err) {
    console.error('Hardware reset error:', err);
    res.status(500).json({ message: 'Server error during hardware reset' });
  }
});

module.exports = router;
