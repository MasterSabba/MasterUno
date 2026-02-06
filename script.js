// --- CONFIGURAZIONE E STATO ---
const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], topCard = null, currentColor = "";
let players = []; // {nick, id, hand, isBot}
let myNick = "", peer, hostConn, connections = [];
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 2 };
let currentPlayerIdx = 0, gameActive = false, isMyTurn = false;

// --- 1. LOGIN E INIZIALIZZAZIONE ---
document.getElementById("loginBtn").onclick = () => {
    myNick = document.getElementById("nickInput").value.trim();
    if (myNick === "") {
        alert("Inserisci un Nickname!");
        document.getElementById("nickInput").style.borderColor = "red";
        return;
    }
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("welcomeText").innerText = "Ciao, " + myNick;
    initPeer();
};

function initPeer() {
    const safeNick = myNick.replace(/\s+/g, '').toUpperCase();
    peer = new Peer(safeNick + "-" + Math.floor(Math.random()*9999));

    peer.on('open', id => document.getElementById("myPeerId").innerText = id);
    
    peer.on('connection', conn => {
        if (connections.length >= gameSettings.maxPlayers - 1) {
            conn.on('open', () => conn.send({type: 'ERROR', msg: 'Stanza piena!'}));
            return;
        }
        setupConnection(conn);
    });
}

// --- 2. GESTIONE PULSANTI MENU ---
document.getElementById("copyBtn").onclick = () => {
    const idText = document.getElementById("myPeerId").innerText;
    const el = document.getElementById("copyHelper");
    el.value = idText; el.select(); el.setSelectionRange(0, 99999);
    document.execCommand("copy");
    showToast("ID COPIATO! 📋");
};

document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsModal").classList.remove("hidden");
document.getElementById("saveSettings").onclick = () => {
    gameSettings.rule07 = document.getElementById("rule07").checked;
    gameSettings.ruleMulti = document.getElementById("ruleMulti").checked;
    gameSettings.maxPlayers = parseInt(document.getElementById("maxPlayersSelect").value);
    document.getElementById("settingsModal").classList.add("hidden");
    updateStatus();
};

document.getElementById("connectBtn").onclick = () => {
    const hostId = document.getElementById("hostIdInput").value.trim().toUpperCase();
    if (!hostId) return;
    const conn = peer.connect(hostId, { metadata: { nick: myNick } });
    setupConnection(conn);
};

function setupConnection(conn) {
    conn.on('open', () => {
        connections.push(conn);
        showToast(conn.metadata?.nick ? conn.metadata.nick + " connesso!" : "Connesso all'host!");
        updateStatus();
        conn.on('data', data => handleData(data));
    });
}

function updateStatus() {
    const total = connections.length + 1;
    document.getElementById("statusText").innerText = `Giocatori: ${total}/${gameSettings.maxPlayers}`;
}

// --- 3. LOGICA DI GIOCO ---
document.getElementById("startGameBtn").onclick = () => {
    if (connections.length === 0 && gameSettings.maxPlayers > 1) {
        // Se sei solo, aggiungi bot per testare
        while (players.length < gameSettings.maxPlayers - 1) {
            players.push({ nick: "Bot " + (players.length+1), id: 'BOT', isBot: true, hand: [] });
        }
    }
    startNewGame();
};

function startNewGame() {
    createDeck();
    playerHand = [];
    for(let i=0; i<7; i++) playerHand.push(deck.pop());
    
    // Distribuzione semplificata per l'host
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;
    
    broadcast({ 
        type: 'START', 
        settings: gameSettings, 
        topCard, currentColor 
    });
    
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    gameActive = true;
    isMyTurn = true;
    renderGame();
}

function createDeck() {
    deck = [];
    colors.forEach(c => {
        values.forEach(v => {
            deck.push({color: c, value: v});
            if(v !== "0") deck.push({color: c, value: v});
        });
    });
    for(let i=0; i<4; i++) {
        deck.push({color: "wild", value: "W"});
        deck.push({color: "wild4", value: "W4"});
    }
    deck.sort(() => Math.random() - 0.5);
}

// --- 4. RENDER E UI ---
function renderGame() {
    const disc = document.getElementById("discardPile");
    disc.innerHTML = `<div class="card ${currentColor}">${topCard.value}</div>`;
    
    const handDiv = document.getElementById("playerHand");
    handDiv.innerHTML = "";
    playerHand.forEach((c, i) => {
        const d = document.createElement("div");
        d.className = `card ${c.color}`;
        d.innerText = c.value;
        d.onclick = () => playCard(i);
        handDiv.appendChild(d);
    });
    
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 ATTESA...";
}

function playCard(i) {
    if (!isMyTurn || !gameActive) return;
    const card = playerHand[i];
    
    // Controllo mossa valida
    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1);
        topCard = card;
        
        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            endTurn();
        }
    }
}

window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    endTurn();
};

function endTurn() {
    if (playerHand.length === 0) {
        showToast("HAI VINTO! 🔥");
        confetti();
        gameActive = false;
        return;
    }
    renderGame();
    // Qui andrebbe la logica del passaggio turno ai peer o bot
}

// --- 5. CHAT E UTILITY ---
function broadcast(data) {
    connections.forEach(c => { if(c.open) c.send(data); });
}

function handleData(d) {
    if (d.type === 'START') {
        gameSettings = d.settings;
        topCard = d.topCard;
        currentColor = d.currentColor;
        // Inizializza mano locale (ricevuta dall'host)
        playerHand = []; for(let i=0; i<7; i++) playerHand.push({color: 'blue', value: '1'}); // Esempio
        document.getElementById("startScreen").classList.add("hidden");
        document.getElementById("gameArea").classList.remove("hidden");
        renderGame();
    }
    if (d.type === 'CHAT') renderChat(d);
}

function renderChat(d) {
    const box = document.getElementById("chatMessages");
    box.innerHTML += `<div><strong>${d.nick}:</strong> ${d.content}</div>`;
    box.scrollTop = box.scrollHeight;
}

function sendChat(emoji) {
    const msg = { type: 'CHAT', nick: myNick, content: emoji };
    broadcast(msg);
    renderChat(msg);
}

function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}
