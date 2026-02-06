// CONFIGURAZIONE REGOLE E STATO
let players = []; // {id, nick, hand, isBot, conn}
let myNick = "";
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 2 };
let deck = [], topCard = null, currentColor = "";
let currentPlayerIdx = 0, isMyTurn = false, drawStack = 0, gameActive = false;
let peer, hostConn;

// 1. LOGIN
document.getElementById("loginBtn").onclick = () => {
    myNick = document.getElementById("nickInput").value.trim() || "User" + Math.floor(Math.random()*99);
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    initPeer();
};

// 2. IMPOSTAZIONI
document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsModal").classList.remove("hidden");
document.getElementById("saveSettings").onclick = () => {
    gameSettings.rule07 = document.getElementById("rule07").checked;
    gameSettings.ruleMulti = document.getElementById("ruleMulti").checked;
    gameSettings.maxPlayers = parseInt(document.getElementById("playerCountSelect").value);
    document.getElementById("settingsModal").classList.add("hidden");
    showToast("REGOLE SALVATE");
};

// 3. MULTIPLAYER (PEERJS)
function initPeer() {
    peer = new Peer(myNick + "-" + Math.random().toString(36).substr(2, 4).toUpperCase());
    peer.on('open', id => document.getElementById("myPeerId").innerText = id);
    
    // Se sono l'Host, ricevo connessioni
    peer.on('connection', conn => {
        if (players.length >= gameSettings.maxPlayers - 1) {
            conn.on('open', () => conn.send({type: 'ERROR', msg: 'Stanza Piena'}));
            return;
        }
        setupHostConnection(conn);
    });
}

function setupHostConnection(conn) {
    conn.on('open', () => {
        players.push({ id: conn.peer, nick: conn.metadata?.nick || "Ospite", conn: conn, hand: [], isBot: false });
        updateStatus();
        conn.on('data', data => handleData(data, conn));
    });
}

document.getElementById("connectBtn").onclick = () => {
    const hostId = document.getElementById("friendIdInput").value.trim().toUpperCase();
    if (hostId) {
        hostConn = peer.connect(hostId, { metadata: { nick: myNick } });
        hostConn.on('data', data => handleData(data, hostConn));
        showToast("CONNESSO A HOST");
    }
};

function updateStatus() {
    document.getElementById("statusText").innerText = `Giocatori: ${players.length + 1}/${gameSettings.maxPlayers}`;
}

// 4. CHAT & EMOJI
function sendEmoji(emoji) {
    const msg = { type: 'CHAT', nick: myNick, content: emoji };
    broadcast(msg);
    displayChat(msg);
}

function displayChat(d) {
    const box = document.getElementById("chatMessages");
    box.innerHTML += `<div class="msg"><strong>${d.nick}:</strong> ${d.content}</div>`;
    box.scrollTop = box.scrollHeight;
}

// 5. LOGICA DI GIOCO (HOSTING)
document.getElementById("playBotBtn").onclick = () => {
    if (players.length + 1 < gameSettings.maxPlayers) {
        showToast("AGGIUNGO BOT...");
        while (players.length + 1 < gameSettings.maxPlayers) {
            players.push({ id: 'BOT-' + Math.random(), nick: 'Bot ' + (players.length + 1), isBot: true, hand: [] });
        }
    }
    startGame();
};

function startGame() {
    createDeck();
    gameActive = true;
    players.forEach(p => p.hand = []);
    let myHand = [];
    for(let i=0; i<7; i++) {
        myHand.push(deck.pop());
        players.forEach(p => p.hand.push(deck.pop()));
    }
    topCard = deck.pop();
    while(topCard.color === 'wild') topCard = deck.pop();
    currentColor = topCard.color;
    
    const state = { 
        type: 'START', 
        settings: gameSettings, 
        deck, topCard, currentColor, 
        allPlayers: [{nick: myNick, id: peer.id}, ...players.map(p => ({nick: p.nick, id: p.id}))] 
    };
    
    broadcast(state);
    // Avvio locale
    myPlayerHand = myHand;
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    renderGame();
}

// 6. FUNZIONI DI SUPPORTO
function createDeck() {
    deck = [];
    const colors = ["red", "blue", "green", "yellow"];
    const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
    colors.forEach(c => { values.forEach(v => { deck.push({color: c, value: v}); if(v !== "0") deck.push({color: c, value: v}); }); });
    for(let i=0; i<4; i++){ deck.push({color: "wild", value: "W"}, {color: "wild4", value: "wild4"}); }
    deck.sort(() => Math.random() - 0.5);
}

function broadcast(data) {
    players.forEach(p => { if(p.conn && p.conn.open) p.conn.send(data); });
}

function handleData(d, conn) {
    if (d.type === 'CHAT') displayChat(d);
    if (d.type === 'START') {
        gameSettings = d.settings;
        // ... logica per settare la mano ricevuta ...
        document.getElementById("startScreen").classList.add("hidden");
        document.getElementById("gameArea").classList.remove("hidden");
        showToast("PARTITA INIZIATA!");
    }
}

function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// (Le altre funzioni di rendering e gioco rimangono simili ma adattate per iterare players[])
