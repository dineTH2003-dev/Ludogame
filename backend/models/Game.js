const mongoose = require('mongoose');

const playerInfoSchema = new mongoose.Schema({
  name: String,
  color: String,
  position: { type: Number, default: 0 },
});

const gameSchema = new mongoose.Schema({
  mode: { type: String, enum: ['single', 'dual'], required: true },
  player1: playerInfoSchema,
  player2: playerInfoSchema,
  winner: { type: String, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isGameOver: { type: Boolean, default: false },
  currentTurn: { type: String, enum: ['player1', 'player2'], default: 'player1' },
  isDataSentToESP32: { type: Boolean, default: false } // ✅ NEW FIELD
});

module.exports = mongoose.model('Game', gameSchema);
