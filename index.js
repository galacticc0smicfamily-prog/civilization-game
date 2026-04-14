const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

let players = {};
let worldObjects = [];
let buildings = [];

// Initialize world resources
for (let i = 0; i < 60; i++) {
    worldObjects.push({ id: 'obj'+i, type: i % 3 === 0 ? 'rock' : 'tree', x: Math.random() * 3000, y: Math.random() * 3000, health: 5 });
}

io.on('connection', (socket) => {

    socket.on('joinGame', (data) => {
        const clanMembers = Object.values(players).filter(p => p.clan === data.clan);
        let spawnPos = { x: 1500, y: 1500 };
        let parentId = null;

        // Lineage Logic: Find a parent if clan isn't empty
        if (clanMembers.length > 0) {
            const potentialParents = clanMembers.filter(p => p.age >= 18);
            if (potentialParents.length > 0) {
                const parent = potentialParents[Math.floor(Math.random() * potentialParents.length)];
                spawnPos = { x: parent.x, y: parent.y };
                parentId = parent.id;
            }
        }

        players[socket.id] = {
            id: socket.id,
            clan: data.clan,
            parentId: parentId,
            x: spawnPos.x, y: spawnPos.y,
            age: 0, hp: 100, stamina: 100,
            inventory: { logs: 0, sticks: 0, stones: 0, rocks: 0, spears: 0, tables: 0 },
            color: data.clan // Red, Blue, Green, or Yellow
        };

        socket.emit('init', { players, worldObjects, buildings, myId: socket.id });
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, y: data.y });
        }
    });

    socket.on('craft', (item) => {
        const p = players[socket.id];
        if (!p) return;
        if (item === 'spear' && p.inventory.sticks >= 4) {
            p.inventory.sticks -= 4;
            p.inventory.spears += 1;
        } else if (item === 'table' && p.inventory.logs >= 10) {
            p.inventory.logs -= 10;
            p.inventory.tables += 1;
        }
        io.emit('updateStats', { id: socket.id, stats: p });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

setInterval(() => {
    for (let id in players) {
        players[id].age += 0.2; // Aging up
        if (players[id].stamina < 100) players[id].stamina += 5;
    }
    io.emit('tick', players);
}, 1000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
