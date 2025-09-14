import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, Gamepad2 } from 'lucide-react';
import { apiClient } from '../utils/api';

export const ModeSelection: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleModeSelect = async (mode: 'single' | 'dual') => {
    setLoading(mode);
    setError('');

    try {
      const response = await apiClient.selectMode(mode);
      navigate('/player-details', { state: { mode, gameId: response.gameId } });
    } catch (err: any) {
      setError(err.message || 'Mode selection failed');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-800 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Gamepad2 className="text-white text-3xl" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Choose Game Mode</h1>
          <p className="text-white/80 text-lg">Select how you want to play Snake & Ladder</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-sm mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => handleModeSelect('single')}
            disabled={loading !== null}
            className="group bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl p-8 text-center transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="bg-gradient-to-r from-blue-400 to-cyan-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <User className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Single Player</h3>
            <p className="text-white/80">Play against the computer</p>
            {loading === 'single' && (
              <div className="mt-4 text-blue-400 font-medium">Loading...</div>
            )}
          </button>

          <button
            onClick={() => handleModeSelect('dual')}
            disabled={loading !== null}
            className="group bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl p-8 text-center transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="bg-gradient-to-r from-orange-400 to-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Users className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Dual Player</h3>
            <p className="text-white/80">Play with a friend</p>
            {loading === 'dual' && (
              <div className="mt-4 text-orange-400 font-medium">Loading...</div>
            )}
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              localStorage.removeItem('jwt_token');
              window.location.href = '/login';
            }}
            className="text-white/60 hover:text-white/80 underline transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};