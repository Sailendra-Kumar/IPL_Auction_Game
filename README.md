
# 🏏 IPL Auction Game

A real-time, browser-based IPL auction simulator where teams compete to build their ultimate squad by bidding on players. Built using Node.js, Socket.IO, and vanilla frontend technologies for a seamless auction experience.

## 🚀 Features

- ⚡ Live player bidding with WebSocket (Socket.IO)
- 🧠 Target player tracking with notifications
- 👥 Multiple teams with separate budgets and player limits
- 📊 Real-time updates of team balance, players, and bids
- 🖼️ Player profiles with images (227 total; 12 included in this version)

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express, Socket.IO
- **Other Tools:** Python HTTP server (for frontend), Ngrok (for tunneling)

## 📁 Folder Structure

```
ipl-auction-game/
├── auction-server/
│   └── server.js         # Node.js backend (Socket.IO)
├── public/
│   ├── index.html        # Team selection UI
│   ├── team.html         # Team auction interface
│   ├── script.js         # Main frontend logic
│   └── images/           # Player images (12 included)
├── README.md
└── .gitignore
```

## 🧪 Getting Started

### 1️⃣ Backend Server

```bash
cd auction-server
npm install
node server.js
```

By default, runs at `http://localhost:3000`

### 2️⃣ Frontend Server

Use Python to host the `public/` folder:

```bash
cd public
python -m http.server 8000
```

Frontend available at: `http://localhost:8000`

## 🌐 Tunneling (Optional - Ngrok)

If you want to expose the backend to the internet:

```bash
ngrok config add-authtoken your-ngrok-token
ngrok http 3000
```

Then update the Socket.IO connection in `script.js` to use the ngrok public URL.

## 📝 Notes

- 227 player images exist in total. .
- All sensitive API keys and IP addresses have been replaced with dummy placeholders.
- Due to copyright restrictions from [https://www.iplt20.com](https://www.iplt20.com), this version includes **tweaked names and placeholder images** instead of original IPL player assets.

## 🧑‍💻 Author

**Sailendra Kumar Parsa**  
📧 sailendrakumarparsa@gmail.com  
🌐 [github.com/Sailendra-Kumar](https://github.com/Sailendra-Kumar)

## 📄 License

This project is licensed under the [MIT License](LICENSE).
