// --- VARIABILI DI STATO ---
let peer, myNick, connections = [], players = [];
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 4 };
let deck = [], playerHand = [], topCard = null, currentColor = "";
let isMyTurn = false, gameActive = false, currentPlayerIdx = 0;

// --- 1. LOGIN & CONNESSIONE ---
document.getElementById("loginBtn").onclick = () => {
    myNick = document.getElementById("nickInput").value.trim();
    if (!myNick) { 
        showToast("⚠️ Inserisci un Nickname!"); 
        return; 
    }
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("welcomeText").innerText = "Ciao, " + myNick;
    initPeer();
};

function initPeer() {
    const id = myNick.replace(/\s+/g, '').toUpperCase() + "-" + Math.floor(Math.random()*999);
    peer = new Peer(id);
    peer.on('open', res => document.getElementById("myPeerId").innerText = res);
    peer.on('connection', conn => {
        conn.on('open', () => {
            if (connections.length >= gameSettings.maxPlayers - 1) {
                conn.send({type: 'ERROR', msg: 'Stanza piena!'});
                return;
            }
            connections.push(conn);
            updateStatus();
            showToast("🎮 Un giocatore si è unito!");
            conn.on('data', d => handleData(d));
        });
    });
}

// --- 2. GESTIONE PARTITA & BOT ---
document.getElementById("startGameBtn").onclick = () => {
    gameActive = true;
    createDeck();
    
    // Inizializza lista giocatori (Umani + Bot)
    players = [];
    players.push({ nick: myNick, id: 'ME', hand: [], isBot: false });
    
    // Aggiungi Bot per riempire i posti mancanti
    const botNeeded = gameSettings.maxPlayers - (connections.length + 1);
    for(let i=0; i < botNeeded; i++) {
        players.push({ 
            nick: "Bot " + (i + 1), 
            id: 'BOT-' + i, 
            isBot: true, 
            hand: drawFromDeck(7) 
        });
    }

    playerHand = drawFromDeck(7);
    topCard = deck.pop();
    // Evita che la prima carta sia una speciale nera
    while(topCard.color === 'wild' || topCard.color === 'wild4') topCard = deck.pop();
    currentColor = topCard.color;

    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    
    currentPlayerIdx = 0; // Inizia sempre l'host (tu)
    isMyTurn = true;
    renderGame();
};

function createDeck() {
    deck = [];
    const colors = ["red", "blue", "green", "yellow"];
    const vals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "draw2"];
    colors.forEach(c => vals.forEach(v => { 
        deck.push({color: c, value: v}); 
        if(v !== "0") deck.push({color: c, value: v}); 
    }));
    for(let i=0; i<4; i++) {
        deck.push({color: "wild", value: "W"});
        deck.push({color: "wild4", value: "W4"});
    }
    deck.sort(() => Math.random() - 0.5);
}

function drawFromDeck(n) {
    let cards = [];
    for(let i=0; i<n; i++) if(deck.length > 0) cards.push(deck.pop());
    return cards;
}

// --- 3. LOGICA DI GIOCO ---
function renderGame() {
    // Render Scarto
    const disc = document.getElementById("discardPile");
    disc.innerHTML = `<div class="card ${currentColor}">${topCard.value}</div>`;
    
    // Render Bot in alto
    const oppDiv = document.getElementById("otherPlayers");
    oppDiv.innerHTML = "";
    players.forEach(p => {
        if(p.id !== 'ME') {
            const badge = document.createElement("div");
            badge.className = "opp-badge";
            badge.innerHTML = `<span class="name">${p.nick}</span><span class="card-count">🎴 ${p.hand.length}</span>`;
            oppDiv.appendChild(badge);
        }
    });

    // Render Tua Mano
    const handDiv = document.getElementById("playerHand");
    handDiv.innerHTML = "";
    playerHand.forEach((c, i) => {
        const d = document.createElement("div");
        d.className = `card ${c.color}`;
        d.innerText = c.value;
        d.onclick = () => playCard(i);
        handDiv.appendChild(d);
    });

    // Indicatore Turno
    const turnText = players[currentPlayerIdx].id === 'ME' ? "🟢 IL TUO TURNO" : `🔴 TURNO DI ${players[currentPlayerIdx].nick}`;
    document.getElementById("turnIndicator").innerText = turnText;
}

function playCard(i) {
    if (!isMyTurn || !gameActive) return;
    const card = playerHand[i];

    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1);
        topCard = card;
        
        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            checkWin('ME');
            nextTurn();
        }
    }
}

function drawCard() {
    if (!isMyTurn || !gameActive) return;
    playerHand.push(...drawFromDeck(1));
    nextTurn();
}

function nextTurn() {
    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    isMyTurn = (players[currentPlayerIdx].id === 'ME');
    renderGame();

    if (players[currentPlayerIdx].isBot && gameActive) {
        setTimeout(botTurn, 1500);
    }
}

function botTurn() {
    const bot = players[currentPlayerIdx];
    let cardIdx = bot.hand.findIndex(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));

    if (cardIdx !== -1) {
        const card = bot.hand.splice(cardIdx, 1)[0];
        topCard = card;
        currentColor = card.color.includes("wild") ? ["red","blue","green","yellow"][Math.floor(Math.random()*4)] : card.color;
        showToast(`${bot.nick} ha giocato ${card.value}`);
    } else {
        bot.hand.push(...drawFromDeck(1));
        showToast(`${bot.nick} pesca una carta`);
    }
    
    checkWin(bot.id);
    if(gameActive) nextTurn();
}

function checkWin(id) {
    const p = (id === 'ME') ? playerHand : players.find(x => x.id === id).hand;
    if (p.length === 0) {
        gameActive = false;
        const winner = (id === 'ME') ? "HAI VINTO!" : "HA VINTO " + players[currentPlayerIdx].nick;
        showToast("🏆 " + winner);
        confetti();
        setTimeout(() => location.reload(), 5000);
    }
}

// --- 4. UTILITY & UI ---
window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    checkWin('ME');
    nextTurn();
};

document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsModal").classList.remove("hidden");
document.getElementById("saveSettings").onclick = () => {
    gameSettings.rule07 = document.getElementById("rule07").checked;
    gameSettings.ruleMulti = document.getElementById("ruleMulti").checked;
    gameSettings.maxPlayers = parseInt(document.getElementById("maxPlayersSelect").value);
    document.getElementById("settingsModal").classList.add("hidden");
    showToast("✅ Regole salvate!");
    updateStatus();
};

document.getElementById("copyBtn").onclick = () => {
    const id = document.getElementById("myPeerId").innerText;
    navigator.clipboard.writeText(id).then(() => showToast("📋 ID Copiato!"));
};

function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 500); }, 2500);
}

function updateStatus() {
    document.getElementById("statusText").innerText = `Giocatori: ${connections.length + 1}/${gameSettings.maxPlayers}`;
}

function handleData(d) {
    if (d.type === 'CHAT') showToast(`${d.nick}: ${d.content}`);
    // Altre logiche multiplayer qui...
}
