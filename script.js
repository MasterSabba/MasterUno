let myName = "", myId = "", peer, conn = [], isHost = false;
let gameData = {
    players: [], // {id, name, handCount, isBot}
    deck: [], hands: {}, topCard: null, curColor: "", 
    turn: 0, dir: 1, stack: 0, rules: { rule07: false, stack: true, combo: false, maxP: 4 },
    active: false
};

// --- LOGIN E SALVATAGGIO ---
document.getElementById('enterBtn').onclick = () => {
    myName = document.getElementById('nickInput').value || "User";
    const wins = localStorage.getItem('mu_wins') || 0;
    document.getElementById('savedWins').innerText = wins;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    initPeer();
};

function saveWin() {
    let wins = parseInt(localStorage.getItem('mu_wins') || 0);
    localStorage.setItem('mu_wins', wins + 1);
}

// --- PEERJS & LOBBY ---
function initPeer() {
    peer = new Peer(Math.random().toString(36).substr(2, 5).toUpperCase());
    peer.on('open', id => { myId = id; document.getElementById('myPeerId').innerText = id; });
    peer.on('connection', c => {
        if(gameData.players.length < gameData.rules.maxP) {
            conn.push(c); setupConn(c);
            toast("Nuovo giocatore connesso!");
        }
    });
}

// --- IMPOSTAZIONI ---
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').classList.remove('hidden');
document.getElementById('saveSettings').onclick = () => {
    gameData.rules = {
        rule07: document.getElementById('check07').checked,
        stack: document.getElementById('checkStack').checked,
        combo: document.getElementById('checkCombo').checked,
        maxP: parseInt(document.getElementById('maxP').value)
    };
    document.getElementById('settingsModal').classList.add('hidden');
    toast("Impostazioni salvate!");
};

// --- LOGICA GIOCO ---
document.getElementById('startMatchBtn').onclick = () => {
    isHost = true;
    // Aggiungi Bot se mancano player
    let currentPlayers = [{id: myId, name: myName, isBot: false}];
    conn.forEach(c => currentPlayers.push({id: c.peer, name: "Amico", isBot: false}));
    while(currentPlayers.length < gameData.rules.maxP) {
        currentPlayers.push({id: 'bot-'+Math.random(), name: "Bot "+currentPlayers.length, isBot: true});
    }
    gameData.players = currentPlayers;
    prepareGame();
};

function prepareGame() {
    // Generazione mazzo e distribuzione
    gameData.deck = createDeck();
    gameData.players.forEach(p => {
        gameData.hands[p.id] = [];
        for(let i=0; i<7; i++) gameData.hands[p.id].push(gameData.deck.pop());
    });
    gameData.topCard = gameData.deck.pop();
    gameData.curColor = gameData.topCard.color === "wild" ? "red" : gameData.topCard.color;
    gameData.active = true;
    broadcast({type: 'START', data: gameData});
    startUI();
}

function render() {
    const handDiv = document.getElementById('playerHand');
    const oppDiv = document.getElementById('opponentsArea');
    handDiv.innerHTML = ""; oppDiv.innerHTML = "";

    // Il mio Badge
    document.getElementById('playerBadge').innerText = `TU: ${gameData.hands[myId].length}`;
    if(gameData.players[gameData.turn].id === myId) document.getElementById('playerBadge').classList.add('active-p');
    else document.getElementById('playerBadge').classList.remove('active-p');

    // Avversari
    gameData.players.forEach((p, i) => {
        if(p.id !== myId) {
            const div = document.createElement('div');
            div.className = `opp-mini ${gameData.turn === i ? 'active-p' : ''}`;
            div.innerHTML = `<div>${p.name}</div><div>🎴 ${gameData.hands[p.id] ? gameData.hands[p.id].length : 7}</div>`;
            oppDiv.appendChild(div);
        }
    });

    // Mia Mano
    gameData.hands[myId].forEach((c, i) => {
        const div = document.createElement('div');
        div.className = `card ${c.color} drawing`;
        div.innerText = c.value;
        div.onclick = () => tryPlayCard(i);
        handDiv.appendChild(div);
    });

    // Centro
    document.getElementById('discardPile').innerHTML = `<div class="card ${gameData.curColor}">${gameData.topCard.value}</div>`;
    document.getElementById('stackBadge').innerText = gameData.stack > 0 ? `+${gameData.stack}` : "";
    document.getElementById('turnIndicator').innerText = gameData.players[gameData.turn].id === myId ? "🟢 TOCCA A TE" : "🔴 TURNO DI " + gameData.players[gameData.turn].name;
}

// --- UTILS ---
function toast(m) {
    const t = document.createElement('div'); t.className="toast"; t.innerText=m;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2000);
}

function sendEmoji(e) {
    toast(myName + ": " + e);
    broadcast({type: 'EMOJI', emoji: e, sender: myName});
}

function broadcast(msg) {
    if(isHost) conn.forEach(c => c.send(msg));
    else if(conn[0]) conn[0].send(msg);
}

function createDeck() {
    const c = ["red", "blue", "green", "yellow"];
    const v = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
    let d = [];
    c.forEach(color => v.forEach(val => { d.push({color, value: val}); if(val!=="0") d.push({color, value: val}); }));
    for(let i=0; i<4; i++) { d.push({color:"wild", value:"W"}); d.push({color:"wild", value:"+4"}); }
    return d.sort(() => Math.random() - 0.5);
}
