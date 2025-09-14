export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface GameMode {
  mode: 'single' | 'dual';
}

export interface Player {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface PlayerDetails {
  mode: 'single' | 'dual';
  players: {
    name: string;
    color: string;
  }[];
}

export interface GameState {
  gameId: string;
  players: Player[];
  currentTurn: number;
  lastDiceRoll: number;
  gameStatus: 'playing' | 'finished';
  winner?: Player;
  board: {
    snakes: { [key: number]: number };
    ladders: { [key: number]: number };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}