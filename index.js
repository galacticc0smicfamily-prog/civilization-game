const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// Crucial for Render: Tell it exactly where the public folder is
app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let worldObjects = [];

// Research-backed Ymay Resource Spawning
function initWorld() {
    worldObjects = [];
    for (let i = 0; i < 60; i++) {
        const type = Math.random() > 0.3 ? 'tree' : 'rock';
        worldObjects.push({ 
            id: 'obj' + i, 
            type: type, 
            x: Math.random() * 3000, 
            y: Math.random() * 3000, 
            hp: 5,
            size: type === 'tree' ? 35 : 20
        });
    }
}
initWorld();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinGame', (data) => {
        try {
            const clan = data.clan || 'red';
            const clanMates = Object.values(players).filter(p => p.clan === clan && p.age >= 18);
            let spawnPos = { x: Math.random() * 2000, y: Math.random() * 2000 };
            
            if (clanMates.length > 0) {
                const parent = clanMates[Math.floor(Math.random() * clanMates.length)];
                spawnPos = { x: parent.x + 50, y: parent.y + 50 };
            }

            players[socket.id] = {
                id: socket.id,
                clan: clan,
                x: spawnPos.x,
                y: spawnPos.y,
                age: 0,
                hp: 100,
                stamina: 100,
                inventory: { rocks: 1, logs: 0, sticks: 0, spears: 0 }, // THE STARTING ROCK
                color: clan,
                lastAction: 0
            };

            socket.emit('init', { players, worldObjects, myId: socket.id });
            socket.broadcast.emit('newPlayer', players[socket.id]);
        } catch (err) {
            console.error("Join Error:", err);
        }
    });

    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, y: data.y });
        }
    });

    socket.on('action', (targetId) => {
        const p = players[socket.id];
        if (!p || Date.now() - p.lastAction < 300) return;

        const objIndex = worldObjects.findIndex(o => o.id === targetId);
        if (objIndex > -1) {
            const obj = worldObjects[objIndex];
            const dist = Math.hypot(obj.x - p.x, obj.y - p.y);
            
            if (dist < 100) {
                p.lastAction = Date.now();
                obj.hp--;
                if (obj.hp <= 0) {
                    if (obj.type === 'tree') { 
                        p.inventory.logs += 1; 
                        p.inventory.sticks += 2; 
                    } else { 
                        p.inventory.rocks += 1; 
                    }
                    worldObjects.splice(objIndex, 1);
                    io.emit('removeObject', targetId);
                }
                io.emit('updateStats', { id: socket.id, stats: p });
            }
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Evolution Loop
setInterval(() => {
    for (let id in players) {
        players[id].age += 0.02;
        if (players[id].stamina < 100) players[id].stamina += 1;
    }
    io.emit('tick', players);
}, 1000);

// RENDER PORT CONFIGURATION
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`YMAY Server Live on Port ${PORT}`);
});
