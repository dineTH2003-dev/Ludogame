import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Palette } from 'lucide-react';
import { apiClient } from '../utils/api';

const PLAYER_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
];

export const PlayerDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.state?.mode || 'single';
  const gameId = location.state?.gameId;

  const [players, setPlayers] = useState(
    mode === 'single'
      ? [{ name: '', color: PLAYER_COLORS[0].value }]
      : [
          { name: '', color: PLAYER_COLORS[0].value },
          { name: '', color: PLAYER_COLORS[1].value },
        ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlayerChange = (index: number, field: 'name' | 'color', value: string) => {
    setPlayers(prev =>
      prev.map((player, i) =>
        i === index ? { ...player, [field]: value } : player
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (players.some(player => !player.name.trim())) {
      setError('Please enter names for all players');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare player details for backend
      const playerDetails: any = {
        player1: { name: players[0].name, color: players[0].color, position: 0 }
      };
      if (mode === 'dual') {
        playerDetails.player2 = { name: players[1].name, color: players[1].color, position: 0 };
      }

      // Submit player details to backend
      await apiClient.submitPlayerDetails(playerDetails);

      // // Send mode and player details to ESP32
      // await apiClient.sendModeToEsp32(gameId);
      // await apiClient.sendPlayerDetailsToEsp32(gameId);

      // Navigate to game board
      navigate('/game', { state: { gameId } });
    } catch (err: any) {
      setError(err.message || 'Failed to submit player details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-blue-600 to-purple-800 flex items-center justify-center p-4">
      <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full shadow-2xl border border-white/20 ${
        mode === 'dual' ? 'max-w-4xl' : 'max-w-md'
      }`}>
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-emerald-400 to-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Palette className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Player Details</h1>
          <p className="text-white/80">
            {mode === 'single' ? 'Set up your player' : 'Set up both players'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`${mode === 'dual' ? 'grid grid-cols-2 gap-4' : ''}`}>
            {players.map((player, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4">
                  {mode === 'single' ? 'Player' : `Player ${index + 1}`}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                      placeholder="Enter player name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/90 text-sm font-medium mb-2">
                      Color
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PLAYER_COLORS.map((color) => {
                        const isTakenByOther =
                          mode === 'dual' &&
                          players.some((p, i) => i !== index && p.color === color.value);
                        return (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => {
                              if (!isTakenByOther) {
                                handlePlayerChange(index, 'color', color.value);
                              }
                            }}
                            disabled={isTakenByOther}
                            className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all ${
                              player.color === color.value
                                ? 'border-white bg-white/20'
                                : isTakenByOther
                                ? 'border-gray-500 opacity-50 cursor-not-allowed'
                                : 'border-white/20 hover:border-white/40'
                            }`}
                          >
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-400 to-blue-500 text-white font-semibold py-3 rounded-lg hover:from-emerald-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <Play className="text-lg" />
            {loading ? 'Starting Game...' : 'Start Game'}
          </button>
        </form>
      </div>
    </div>
  );
};
