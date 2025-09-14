
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RotateCcw, Trophy, LogOut, AlertCircle, Zap } from 'lucide-react';
import { apiClient } from '../utils/api';

interface BackendGameState {
  player1: { name: string; position: number };
  player2: { name: string; position: number };
  winner: string | null;
  isGameOver: boolean;
  currentTurn: 'player1' | 'player2';
}

export const GameBoard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const gameId = location.state?.gameId;

  const [gameState, setGameState] = useState<BackendGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [winnerPopupShown, setWinnerPopupShown] = useState(false);
  
  // Hardware reset detection states
  const [hardwareResetDetected, setHardwareResetDetected] = useState(false);
  const [resetNotification, setResetNotification] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'hardware_reset'>('connected');
  
  // Refs to track previous state for hardware reset detection
  const previousGameState = useRef<BackendGameState | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced polling with hardware reset detection
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const fetchGameState = async () => {
      if (!gameId) {
        setError('No game ID found. Please start a new game.');
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.getGameState(gameId);
        
        // Hardware Reset Detection Logic
        if (previousGameState.current && gameState) {
          const prevState = previousGameState.current;
          const currentState = response;
          
          // Detect hardware reset conditions:
          // 1. Both players were beyond position 1 and now both are at position 1
          // 2. Game was not over and positions reset without being a new game
          // 3. Winner was cleared unexpectedly
          const wasGameInProgress = (prevState.player1.position > 1 || prevState.player2.position > 1) && !prevState.isGameOver;
          const positionsReset = currentState.player1.position === 1 && currentState.player2.position === 1;
          const gameReset = !currentState.isGameOver && currentState.winner === null;
          
          if (wasGameInProgress && positionsReset && gameReset) {
            console.log('🔧 Hardware reset detected from Arduino Mega');
            
            // Handle hardware reset
            setHardwareResetDetected(true);
            setConnectionStatus('hardware_reset');
            setShowWinnerPopup(false);
            setWinnerPopupShown(false);
            setResetNotification('Game reset by hardware device (Arduino Mega)');
            
            // Clear notification after 5 seconds
            if (resetTimeoutRef.current) {
              clearTimeout(resetTimeoutRef.current);
            }
            resetTimeoutRef.current = setTimeout(() => {
              setResetNotification('');
              setHardwareResetDetected(false);
              setConnectionStatus('connected');
            }, 5000);
          }
        }
        
        // Store current state for next comparison
        previousGameState.current = response;
        setGameState(response);
        setError('');
        setConnectionStatus('connected');
        consecutiveErrors = 0;
        
      } catch (err: any) {
        consecutiveErrors++;
        const errorMessage = err.message || 'Failed to fetch game state';
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          setConnectionStatus('disconnected');
          setError(`Connection lost: ${errorMessage} (${consecutiveErrors} consecutive failures)`);
        } else {
          setError(`${errorMessage} (Retry ${consecutiveErrors}/${maxConsecutiveErrors})`);
        }
        
        console.error('Game state fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchGameState();
    
    // Enhanced polling - faster to catch hardware resets quickly
    interval = setInterval(fetchGameState, 1000); // Increased from 2000ms to 1000ms

    return () => {
      clearInterval(interval);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [gameId]); // Removed gameState from dependencies to avoid infinite loops

  // Winner popup detection
  useEffect(() => {
    if (gameState?.isGameOver && gameState?.winner && !winnerPopupShown && !hardwareResetDetected) {
      setShowWinnerPopup(true);
      setWinnerPopupShown(true);
    }
  }, [gameState, winnerPopupShown, hardwareResetDetected]);

  const handleCloseWinnerPopup = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowWinnerPopup(false);
    }
  };

  const handlePlayAgain = async () => {
    try {
      if (!gameId) return;
      
      setLoading(true);
      console.log('🔄 Initiating play again from web interface...');
      
      // First, notify backend to send play-again to ESP32
      await apiClient.request(`/play-again/${gameId}`, { method: 'POST' });
      console.log('✅ Play again signal sent to ESP32');
      
      // Then, reset backend game state
      await apiClient.resetGame(gameId);
      console.log('✅ Backend game state reset');
      
      // Reset UI state
      setShowWinnerPopup(false);
      setWinnerPopupShown(false);
      setHardwareResetDetected(false);
      setResetNotification('');
      
      // Fetch updated game state
      const refreshed = await apiClient.getGameState(gameId);
      setGameState(refreshed);
      previousGameState.current = refreshed;
      
      console.log('🎮 Play again completed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to restart game');
      console.error('Play again error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndGame = async () => {
    try {
      if (gameId) {
        console.log('🛑 Initiating end game from web interface...');
        await apiClient.endGame(gameId);
        console.log('✅ End game signal sent to ESP32');
      }
    } catch (err) {
      console.error('Failed to send end game signal:', err);
      setError('Failed to send end game signal to hardware');
    } finally {
      // Navigate away regardless of signal success
      navigate('/mode-select');
    }
  };

  const handleTestMove = async (player: number, dice: number) => {
    try {
      await apiClient.updatePosition(gameId, dice, player);
      const response = await apiClient.getGameState(gameId);
      setGameState(response);
      previousGameState.current = response;
    } catch (err: any) {
      setError(err.message || 'Failed to update position');
    }
  };

  const handleRetryConnection = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.getGameState(gameId);
      setGameState(response);
      previousGameState.current = response;
      setConnectionStatus('connected');
    } catch (err: any) {
      setError(err.message || 'Failed to reconnect');
    } finally {
      setLoading(false);
    }
  };

  const renderBoard = () => {
    const squares = [];
    for (let row = 9; row >= 0; row--) {
      for (let col = 0; col < 10; col++) {
        const position = row % 2 === 1 ? row * 10 + (9 - col) + 1 : row * 10 + col + 1;
        const playersOnSquare = [];
        
        if (gameState?.player1.position === position) {
          playersOnSquare.push({ name: gameState.player1.name, color: '#EF4444' });
        }
        if (gameState?.player2.position === position) {
          playersOnSquare.push({ name: gameState.player2.name, color: '#3B82F6' });
        }
        
        squares.push(
          <div
            key={position}
            className={`relative aspect-square border border-gray-300 flex items-center justify-center text-xs font-medium transition-colors duration-200 ${
              position % 2 === 0 ? 'bg-green-100' : 'bg-yellow-100'
            } ${hardwareResetDetected ? 'animate-pulse bg-blue-200' : ''}`}
          >
            <span className="absolute top-1 left-1 text-gray-600">{position}</span>
            <div className="flex gap-1">
              {playersOnSquare.map((player, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold transition-transform duration-200 hover:scale-110"
                  style={{ backgroundColor: player.color }}
                  title={player.name}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            {position === 16 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 47 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 49 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 62 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 64 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 74 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 89 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 92 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 95 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            {position === 99 && <div className="absolute bottom-1 right-1 text-red-500 text-xs">🐍</div>}
            
            {position === 2 && <div className="absolute bottom-1 right-1 text-blue-500 text-xs">🪜</div>}
            {position === 4 && <div className="absolute bottom-1 right-1 text-blue-500 text-xs">🪜</div>}
            {position === 9 && <div className="absolute bottom-1 right-1 text-blue-500 text-xs">🪜</div>}
            {position === 33 && <div className="absolute bottom-1 right-1 text-blue-500 text-xs">🪜</div>}
            {position === 39 && <div className="absolute bottom-1 right-1 text-blue-500 text-xs">🪜</div>}
            {position === 71 && <div className="absolute bottom-1 right-1 text-blue-500 text-xs">🪜</div>}
          </div>
        );
      }
    }
    return squares;
  };

  // Connection Status Indicator
  const renderConnectionStatus = () => {
    const statusConfig = {
      connected: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '🟢', text: 'Connected' },
      disconnected: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '🔴', text: 'Disconnected' },
      hardware_reset: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '🔧', text: 'Hardware Reset' }
    };
    
    const config = statusConfig[connectionStatus];
    
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bg} border border-white/20`}>
        <span>{config.icon}</span>
        <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-800 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading game...</div>
        </div>
      </div>
    );
  }

  if (error && !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-orange-600 to-yellow-800 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-200 mx-auto mb-4" />
          <div className="text-red-200 text-xl mb-4">Connection Error</div>
          <div className="text-red-300 text-sm mb-6">{error}</div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleRetryConnection}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={() => navigate('/mode-select')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isGameFinished = gameState?.isGameOver || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
          {/* Game Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-white">Snake & Ladder</h1>
              {renderConnectionStatus()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePlayAgain}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <RotateCcw className="text-lg" />
                Play Again
              </button>
              <button
                onClick={handleEndGame}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="text-lg" />
                End Game
              </button>
            </div>
          </div>

          {/* Hardware Reset Notification */}
          {resetNotification && (
            <div className="mb-4 bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 flex items-center gap-3">
              <Zap className="text-blue-400 w-5 h-5" />
              <div className="text-blue-200">
                <span className="font-semibold">Hardware Reset Detected:</span>
                <span className="ml-2">{resetNotification}</span>
              </div>
            </div>
          )}

          {/* Game Status */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Players</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: '#EF4444' }}
                  >
                    {gameState?.player1.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white">{gameState?.player1.name}</span>
                  <span className="text-white/60 text-sm">Position: {gameState?.player1.position}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: '#3B82F6' }}
                  >
                    {gameState?.player2.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white">{gameState?.player2.name}</span>
                  <span className="text-white/60 text-sm">Position: {gameState?.player2.position}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Game Info</h3>
              <div className="space-y-2 text-white/80">
                {isGameFinished && gameState?.winner && (
                  <div className="flex items-center gap-2 text-yellow-300">
                    <Trophy className="text-lg" />
                    <span className="font-bold">Winner: {gameState.winner}!</span>
                  </div>
                )}
                {!isGameFinished && gameState && (
                  <div className="text-white/80">
                    <span className="font-bold">
                      {gameState[gameState.currentTurn]?.name}
                    </span>
                    {"'s turn"}
                  </div>
                )}
                <div className="text-white/60 text-sm">
                  Game ID: {gameId?.substring(0, 8)}...
                </div>
              </div>
            </div>
          </div>

          {/* Game Board */}
          <div className="bg-white rounded-lg p-4">
            <div className="grid grid-cols-10 gap-1 aspect-square max-w-2xl mx-auto">
              {renderBoard()}
            </div>
          </div>

          {/* Connection Error (non-critical) */}
          {error && gameState && (
            <div className="mt-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="text-yellow-400 w-4 h-4" />
              <span className="text-yellow-200 text-sm">
                {error}
              </span>
              <button
                onClick={handleRetryConnection}
                className="ml-auto bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Winner Modal */}
          {showWinnerPopup && gameState?.winner && !hardwareResetDetected && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleCloseWinnerPopup}>
              <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Congratulations!</h2>
                <p className="text-xl text-gray-600 mb-6">
                  <span className="font-bold px-3 py-1 rounded-full text-white bg-green-500">
                    {gameState.winner}
                  </span>
                  {' '}wins the game!
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handlePlayAgain}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={handleEndGame}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    End Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};