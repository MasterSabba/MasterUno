let peer, myNick, connections = [], players = [];
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 2 };
let deck = [], playerHand = [], topCard = null, currentColor = "";
let isMyTurn = false, gameActive = false;

// LOGIN
document.getElementById("loginBtn").onclick = () => {
    myNick = document.getElementById("nickInput").value.trim();
    if (!myNick) { alert("Metti un Nickname!"); return; }
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("welcomeText").innerText = "Ciao, " + myNick;
    initPeer();
};

function initPeer() {
    const id = myNick.replace(/\s+/g, '') + "-" + Math.floor(Math.random()*999);
    peer = new Peer(id);
    peer.on('open', res => document.getElementById("myPeerId").innerText = res);
    peer.on('connection', conn => {
        conn.on('open', () => {
            connections.push(conn);
            updateStatus();
            conn.on('data', d => handleData(d));
        });
    });
}

// FIX: AVVIO PARTITA FORZATO
document.getElementById("startGameBtn").onclick = () => {
    gameActive = true;
    createDeck();
    
    // Reset e distribuzione
    playerHand = [];
    for(let i=0; i<7; i++) playerHand.push(deck.pop());
    
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;

    // Se ci sono amici connessi, manda lo start
    connections.forEach(c => {
        c.send({
            type: 'START',
            settings: gameSettings,
            topCard: topCard,
            color: currentColor
        });
    });

    // Mostra area di gioco
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    isMyTurn = true;
    renderGame();
};

function createDeck() {
    deck = [];
    const colors = ["red", "blue", "green", "yellow"];
    const vals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "draw2"];
    colors.forEach(c => vals.forEach(v => { 
        deck.push({color: c, value: v}); 
        if(v!=="0") deck.push({color: c, value: v}); 
    }));
    for(let i=0; i<4; i++) deck.push({color: "wild", value: "W"}, {color: "wild4", value: "W4"});
    deck.sort(() => Math.random() - 0.5);
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

function updateStatus() {
    document.getElementById("statusText").innerText = `Giocatori: ${connections.length + 1}/${gameSettings.maxPlayers}`;
}

function handleData(d) {
    if(d.type === 'START') {
        topCard = d.topCard;
        currentColor = d.color;
        playerHand = []; for(let i=0; i<7; i++) playerHand.push({color: 'red', value: '1'}); // Mano dummy per client
        document.getElementById("startScreen").classList.add("hidden");
        document.getElementById("gameArea").classList.remove("hidden");
        renderGame();
    }
}

// COPIA ID
document.getElementById("copyBtn").onclick = () => {
    const id = document.getElementById("myPeerId").innerText;
    navigator.clipboard.writeText(id);
    alert("ID Copiato!");
};
