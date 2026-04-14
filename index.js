<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
    // 1. Setup Variables
    const socket = io();
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let myId = null;
    let players = {};
    let worldObjects = [];
    const keys = {};

    // 2. UI Functions
    function join(c) {
        document.getElementById('titleScreen').style.display = 'none';
        socket.emit('joinGame', { clan: c });
    }

    // 3. Input Handling
    window.addEventListener('keydown', function(e) { keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', function(e) { keys[e.key.toLowerCase()] = false; });

    // 4. Socket Listeners
    socket.on('init', function(data) {
        players = data.players;
        worldObjects = data.worldObjects;
        myId = data.myId;
        if (players[myId]) {
            document.getElementById('clanVal').innerText = players[myId].clan.toUpperCase();
        }
    });

    socket.on('newPlayer', function(p) { players[p.id] = p; });
    
    socket.on('playerMoved', function(d) { 
        if (players[d.id]) { 
            players[d.id].x = d.x; 
            players[d.id].y = d.y; 
        }
    });

    socket.on('tick', function(serverPlayers) {
        players = serverPlayers;
        if (myId && players[myId]) {
            const me = players[myId];
            document.getElementById('ageVal').innerText = Math.floor(me.age);
            document.getElementById('h-logs').innerText = me.inventory.logs;
            document.getElementById('h-spears').innerText = me.inventory.spears;
        }
    });

    // 5. Game Loop
    function draw() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (!myId || !players[myId]) {
            requestAnimationFrame(draw);
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const me = players[myId];
        let moved = false;
        if (keys['w']) { me.y -= 5; moved = true; }
        if (keys['s']) { me.y += 5; moved = true; }
        if (keys['a']) { me.x -= 5; moved = true; }
        if (keys['d']) { me.x += 5; moved = true; }

        if (moved) {
            socket.emit('playerMovement', { x: me.x, y: me.y });
        }

        const camX = me.x - canvas.width / 2;
        const camY = me.y - canvas.height / 2;

        // Draw Trees/Rocks
        worldObjects.forEach(function(o) {
            ctx.fillStyle = (o.type === 'tree') ? '#2e7d32' : '#757575';
            ctx.beginPath();
            ctx.arc(o.x - camX, o.y - camY, 20, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw All Players
        for (let id in players) {
            let p = players[id];
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText("Age: " + Math.floor(p.age), p.x - camX - 15, p.y - camY - 25);
        }
        requestAnimationFrame(draw);
    }
    draw();
</script>
