// auction-server/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ['http://localhost:8000', 'http://Your_IP:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(cors({
    origin: ['http://localhost:8000', 'http://Your_IP:3000'],
    methods: ['GET', 'POST'],
    credentials: true
}));

// Store team data
let teams = {
    "CSK": { Balance:1200000000,players: [], bids: [], foreignPlayers: 0 },
    "MI": { Balance:1200000000,players: [], bids: [], foreignPlayers: 0 },
    "RCB": { Balance:1200000000,players: [], bids: [], foreignPlayers: 0 },
    "SRH": { Balance:1200000000,players: [], bids: [], foreignPlayers: 0 },
    "KKR": { Balance:1200000000,players: [], bids: [], foreignPlayers: 0 }
};

// Store player list and target lists
let players = [];
let targetLists = {};

// Serve static files
app.use(express.static('public'));

// Serve team selection page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Serve team details page
app.get('/team/:teamName', (req, res) => {
    res.sendFile(__dirname + '/public/team.html');
});

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('updateTeams', teams);
    socket.emit('updatePlayers', players);
    socket.emit('updateTargetList', targetLists[socket.id] || []);

    socket.on('setPlayers', (playerList) => {
        console.log('Received player list:', playerList.length);
        players = playerList;
        io.emit('updatePlayers', players);
    });

    socket.on('updatePlayer', (data) => {
    const { Balance,team, player, bid } = data;
    

    if (!teams[team]) {
        console.warn(`Invalid team: ${team}`);
        return;
    }
    if (!player || !player.name) {
        console.warn('Invalid player data:', player);
        return;
    }
    if (typeof bid !== 'number' || bid <= 0) {
        console.warn('Invalid bid:', bid);
        return;
    }

    console.log('Player sold:', player.name, 'to', team);
    // Deduct bid amount from team's balance
    teams[team].Balance -= bid;
    teams[team].players.push(player);
    teams[team].bids.push(bid);
    const country = player.country.toLowerCase();
    const isIndian = country.includes('india');

    if (!isIndian) {
        teams[team].foreignPlayers++;
    }
    players = players.filter(p => p.name !== player.name);
    io.emit('updateTeams', teams);
    io.emit('updatePlayers', players);

    for (let socketId in targetLists) {
        if (targetLists[socketId].includes(player.name)) {
            console.log('Sending sold notification to:', socketId);
            io.to(socketId).emit('playerSoldNotification', {
                player: player.name,
                team,
                bid
            });
        }
    }
});

    socket.on('playerUpForBid', (player) => {
        console.log('Player up for bid:', player.name);
        for (let socketId in targetLists) {
            if (targetLists[socketId].includes(player.name)) {
                console.log('Sending bid notification to:', socketId);
                io.to(socketId).emit('playerBidNotification', {
                    player: player.name
                });
            }
        }
    });

    socket.on('updateTargetList', (targetList) => {
        console.log('Target list updated for', socket.id, ':', targetList);
        targetLists[socket.id] = targetList;
        socket.emit('updateTargetList', targetList);
    });

    socket.on('disconnect', () => {
        delete targetLists[socket.id];
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});