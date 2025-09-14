import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { ModeSelection } from './components/ModeSelection';
import { PlayerDetails } from './components/PlayerDetails';
import { GameBoard } from './components/GameBoard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  const handleAuth = (token: string, user: any) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={
              !isAuthenticated ? (
                <Login onLogin={handleAuth} />
              ) : (
                <Navigate to="/mode-select" replace />
              )
            } 
          />
          <Route 
            path="/signup" 
            element={
              !isAuthenticated ? (
                <Signup onSignup={handleAuth} />
              ) : (
                <Navigate to="/mode-select" replace />
              )
            } 
          />
          <Route 
            path="/mode-select" 
            element={
              isAuthenticated ? (
                <ModeSelection />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/player-details" 
            element={
              isAuthenticated ? (
                <PlayerDetails />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/game" 
            element={
              isAuthenticated ? (
                <GameBoard />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/mode-select" : "/login"} replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;