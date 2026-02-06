// VARIABILI GLOBALI
let myNick = "";
let players = [];
let deck = [];
let playerHand = [];
let topCard = null;
let currentColor = "";
let currentPlayerIdx = 0;
let drawStack = 0;
let gameActive = false;
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 4 };

// --- GESTIONE SCHERMATE ---
function openSettings() { document.getElementById('settingsModal').classList.remove('hidden'); }
function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }

// --- UTILS ---
const getSym = (v) => {
    if(v === "skip") return "🚫";
    if(v === "reverse") return "🔄";
    if(v === "draw2") return "+2";
    return v;
};

function showToast(msg) {
    const t = document.createElement("div");
    t.style = "position:fixed; top:20px; background:#f1c40f; color:black; padding:10px 20px; border-radius:20px; font-weight:bold; z-index:1000;";
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

// --- LOGICA LOGIN ---
document.getElementById('loginBtn').onclick = () => {
    myNick = document.getElementById('nickInput').value.trim() || "Giocatore";
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('welcomeText').innerText = "Ciao, " + myNick;
};

// --- IMPOSTAZIONI ---
document.getElementById('saveSettings').onclick = () => {
    gameSettings.rule07 = document.getElementById('rule07').checked;
    gameSettings.ruleMulti = document.getElementById('ruleMulti').checked;
    gameSettings.maxPlayers = parseInt(document.getElementById('maxPlayersSelect').value);
    closeSettings();
    showToast("Regole Salvate!");
};

// --- AVVIO GIOCO E BOT ---
document.getElementById('startGameBtn').onclick = () => {
    gameActive = true;
    createDeck();
    
    // Creazione Giocatori (Umano + Bot)
    players = [{ nick: myNick, id: 'ME', hand: [] }];
    for(let i=1; i < gameSettings.maxPlayers; i++) {
        players.push({ 
            nick: "Bot " + i, 
            id: 'BOT' + i, 
            isBot: true, 
            hand: drawCards(7) 
        });
    }

    playerHand = drawCards(7);
    topCard = deck.pop();
    while(topCard.color === "wild") topCard = deck.pop(); // Evita carta nera all'inizio
    currentColor = topCard.color;

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameArea').classList.remove('hidden');
    renderGame();
};

function createDeck() {
    deck = [];
    const colors = ["red", "blue", "green", "yellow"];
    const values = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
    colors.forEach(c => {
        values.forEach(v => {
            deck.push({color: c, value: v});
            if(v !== "0") deck.push({color: c, value: v});
        });
    });
    for(let i=0; i<4; i++) deck.push({color:"wild", value:"W"});
    deck.sort(() => Math.random() - 0.5);
}

function drawCards(n) {
    let res = [];
    for(let i=0; i<n; i++) {
        if(deck.length === 0) createDeck();
        res.push(deck.pop());
    }
    return res;
}

// --- RENDERING ---
function renderGame() {
    // Tavolo Centrale
    document.getElementById('discardPile').innerHTML = `
        <div class="card ${currentColor}" data-symbol="${getSym(topCard.value)}">${getSym(topCard.value)}</div>
    `;
    document.getElementById('deckArea').innerHTML = `<div class="card-back-deck" onclick="userDraw()">MAZZO</div>`;

    // Bot (in alto)
    const oppRow = document.getElementById('otherPlayers');
    oppRow.innerHTML = "";
    players.forEach(p => {
        if(p.id !== 'ME') {
            oppRow.innerHTML += `<div class="opp-badge">${p.nick}<br>🎴 ${p.hand.length}</div>`;
        }
    });

    // Tua Mano
    const handDiv = document.getElementById('playerHand');
    handDiv.innerHTML = "";
    playerHand.forEach((c, i) => {
        const d = document.createElement("div");
        d.className = `card ${c.color}`;
        d.setAttribute('data-symbol', getSym(c.value));
        d.innerText = getSym(c.value);
        d.onclick = () => playCard(i);
        handDiv.appendChild(d);
    });

    const isMyTurn = (players[currentPlayerIdx].id === 'ME');
    document.getElementById('turnIndicator').innerText = isMyTurn ? "🟢 TOCCA A TE" : "🔴 TURNO DI " + players[currentPlayerIdx].nick;
}

// --- AZIONI ---
function playCard(idx) {
    if(players[currentPlayerIdx].id !== 'ME') return;
    const card = playerHand[idx];

    if(drawStack > 0 && card.value !== "draw2") return showToast("Devi rispondere al +2!");

    if(card.color === currentColor || card.value === topCard.value || card.color === "wild") {
        playerHand.splice(idx, 1);
        topCard = card;
        currentColor = card.color;
        
        if(card.value === "draw2") drawStack += 2;
        
        if(card.color === "wild") {
            document.getElementById('colorPicker').classList.remove('hidden');
        } else {
            checkWin();
            if(gameActive) nextTurn(card.value === "skip");
        }
    }
}

function userDraw() {
    if(players[currentPlayerIdx].id !== 'ME') return;
    playerHand.push(...drawCards(drawStack || 1));
    drawStack = 0;
    nextTurn();
}

function nextTurn(skip = false) {
    currentPlayerIdx = (currentPlayerIdx + (skip ? 2 : 1)) % players.length;
    let p = players[currentPlayerIdx];
    
    // Gestione +2
    if(drawStack > 0) {
        let pHand = (p.id === 'ME' ? playerHand : p.hand);
        if(!pHand.some(c => c.value === "draw2")) {
            showToast(p.nick + " pesca +" + drawStack);
            pHand.push(...drawCards(drawStack));
            drawStack = 0;
            return nextTurn();
        }
    }

    renderGame();
    if(p.isBot && gameActive) setTimeout(botTurn, 1500);
}

function botTurn() {
    const bot = players[currentPlayerIdx];
    let idx = bot.hand.findIndex(c => (drawStack > 0 ? c.value === "draw2" : (c.color === currentColor || c.value === topCard.value || c.color === "wild")));
    
    if(idx !== -1) {
        let card = bot.hand.splice(idx, 1)[0];
        topCard = card;
        currentColor = (card.color === "wild") ? "red" : card.color;
        if(card.value === "draw2") drawStack += 2;
        checkWin();
        if(gameActive) nextTurn(card.value === "skip");
    } else {
        bot.hand.push(...drawCards(Math.max(1, drawStack)));
        drawStack = 0;
        nextTurn();
    }
}

function checkWin() {
    let pHand = (players[currentPlayerIdx].id === 'ME') ? playerHand : players[currentPlayerIdx].hand;
    if(pHand.length === 0) {
        gameActive = false;
        alert("🏆 HA VINTO " + players[currentPlayerIdx].nick + "!");
        location.reload();
    }
}

function setWildColor(c) {
    currentColor = c;
    document.getElementById('colorPicker').classList.add('hidden');
    checkWin();
    if(gameActive) nextTurn();
}
