const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('jwt_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(`Unable to connect to the server. Please ensure the backend API is running at ${API_BASE_URL}`);
      }
      throw error;
    }
  }

  async signup(username: string, email: string, password: string) {
    return this.request('/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async selectMode(mode: string) {
    return this.request('/mode-select', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async submitPlayerDetails(playerDetails: any) {
    return this.request('/player-details', {
      method: 'POST',
      body: JSON.stringify(playerDetails),
    });
  }

  async getGameState(gameId: string) {
    return this.request(`/get-game-state/${gameId}`);
  }

  async updatePosition(gameId: string, dice: number, player: number) {
    return this.request(`/update-position/${gameId}`, {
      method: 'POST',
      body: JSON.stringify({ dice, player }),
    });
  }

  async resetGame(gameId: string) {
    return this.request(`/reset-game/${gameId}`, {
      method: 'POST',
    });
  }

  // --- ESP32 integration ---
  async sendModeToEsp32(gameId: string) {
    return this.request(`/send-mode/${gameId}`);
  }

  async sendPlayerDetailsToEsp32(gameId: string) {
    return this.request(`/send-player-details/${gameId}`);
  }

  // Add this method to the ApiClient class
  async endGame(gameId: string) {
  return this.request(`/end-game/${gameId}`, {
    method: 'POST',
  });
}

// Add this method to the ApiClient class in api.ts
async getGameStateWithPolling(gameId: string) {
  // This method will be used for more frequent polling to catch hardware resets
  return this.request(`/get-game-state/${gameId}`);
}

// You can also add a specific method for handling hardware reset notifications
async handleHardwareReset(gameId: string) {
  // This could be used if you want to add additional client-side handling
  return this.getGameState(gameId);
}

}

export const apiClient = new ApiClient();