let peer, myNick, connections = [], players = [];
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 4 };
let deck = [], playerHand = [], topCard = null, currentColor = "";
let isMyTurn = false, gameActive = false;

// LOGIN & NICKNAME
document.getElementById("loginBtn").onclick = () => {
    myNick = document.getElementById("nickInput").value.trim();
    if (!myNick) { showToast("Metti un Nickname!"); return; }
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
            connections.push(conn);
            updateStatus();
            showToast("Giocatore connesso!");
            conn.on('data', d => handleData(d));
        });
    });
}

// INIZIA PARTITA
document.getElementById("startGameBtn").onclick = () => {
    gameActive = true;
    createDeck();
    playerHand = drawFromDeck(7);
    topCard = deck.pop();
    while(topCard.color === 'wild' || topCard.color === 'wild4') topCard = deck.pop();
    currentColor = topCard.color;

    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    isMyTurn = true;
    renderGame();
};

function createDeck() {
    deck = [];
    const colors = ["red", "blue", "green", "yellow"];
    const vals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "draw2"];
    colors.forEach(c => vals.forEach(v => { deck.push({color: c, value: v}); if(v!=="0") deck.push({color: c, value: v}); }));
    for(let i=0; i<4; i++) deck.push({color: "wild", value: "W"}, {color: "wild4", value: "W4"});
    deck.sort(() => Math.random() - 0.5);
}

function drawFromDeck(n) {
    let cards = [];
    for(let i=0; i<n; i++) if(deck.length > 0) cards.push(deck.pop());
    return cards;
}

function drawCard() {
    if(!isMyTurn) return;
    playerHand.push(...drawFromDeck(1));
    renderGame();
}

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
    document.getElementById("turnIndicator").innerText = isMyTurn ? "IL TUO TURNO" : "ATTESA...";
}

function playCard(i) {
    if(!isMyTurn) return;
    const card = playerHand[i];
    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1);
        topCard = card;
        if (!card.color.includes("wild")) {
            currentColor = card.color;
            renderGame();
        } else {
            document.getElementById("colorPicker").classList.remove("hidden");
        }
    }
}

window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    renderGame();
};

// UTILITY & MODALI
document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsModal").classList.remove("hidden");
document.getElementById("saveSettings").onclick = () => {
    gameSettings.rule07 = document.getElementById("rule07").checked;
    gameSettings.ruleMulti = document.getElementById("ruleMulti").checked;
    gameSettings.maxPlayers = parseInt(document.getElementById("maxPlayersSelect").value);
    document.getElementById("settingsModal").classList.add("hidden");
    showToast("Regole salvate!");
};

document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(document.getElementById("myPeerId").innerText);
    showToast("ID Copiato!");
};

function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 500); }, 2000);
}

function sendChat(e) { showToast("Hai inviato: " + e); }
function updateStatus() { document.getElementById("statusText").innerText = `Giocatori: ${connections.length + 1}/${gameSettings.maxPlayers}`; }
