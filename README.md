
# Smart Snake and Ladder Game 🎲

A modern web-based version of the classic Snake and Ladder game with real-time updates, multiplayer support, and a fun interactive interface.

---

## 📋 Requirements

Make sure you have these installed before starting:

- [Node.js](https://nodejs.org/) (v14 or higher)  
- [npm](https://www.npmjs.com/) (comes with Node.js)  
- [MongoDB Community Edition](https://www.mongodb.com/try/download/community)  
- [Git](https://git-scm.com/)  

---

## 🚀 Setup Instructions

Follow these steps to run the game on your computer:

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/smart-snake-ladder-game.git
cd smart-snake-ladder-game
````

### 2. Install Dependencies

**Backend:**

```bash
cd ludogame/backend
npm install
```

**Frontend:**

```bash
cd ../frontend
npm install
```

### 3. Start MongoDB

* **Windows:** Open Command Prompt and run:

```bash
mongod
```

(or start MongoDB service from the Services panel)

* **macOS / Linux:**

```bash
sudo systemctl start mongod
```

### 4. Run the Application

**Start the backend server:**

```bash
cd ludogame/backend
node index.js
```

(You should see a message like `Server running on http://localhost:5000`)

**Start the frontend development server:**
Open a **new terminal**:

```bash
cd ludogame/frontend
npm run dev
```

### 5. Open the Game

* Open your browser
* Go to **[http://localhost:3000](http://localhost:3000)**
* Start playing! 🎉

---

## 🎮 How to Play

1. Open the game in your browser
2. Select game mode and enter player names
3. Press the button to roll the dice
4. Land on ladders to go up, snakes to go down
5. First player to reach 100 wins! 🏆

---

## 📦 Tech Used

* **Backend:** Node.js, Express, MongoDB, Socket.io
* **Frontend:** React, Vite, TailwindCSS, Zustand
* **Real-time:** WebSockets (Socket.io)



