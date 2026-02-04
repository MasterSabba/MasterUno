const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, peer, conn;

// Inizializzazione
const initPeer = () => {
    const myId = Math.random().toString(36).substr(2, 5).toUpperCase();
    peer = new Peer(myId);
    peer.on('open', id => document.getElementById("myPeerId").innerText = id);
    peer.on('connection', c => { conn = c; conn.on('open', () => { setupConn(); startG(false); }); });
};
initPeer();

function setupConn() {
    conn.on('data', d => {
        if (d.type === "SYNC") {
            topCard = d.topCard; currentColor = d.currentColor; 
            isMyTurn = d.isNextTurn; opponentHand = new Array(d.oppHandSize).fill({});
            renderGame();
        }
    });
}

function createDeck() {
    deck = [];
    colors.forEach(c => values.forEach(v => { 
        deck.push({color:c, value:v}); 
        if(v !== "0") deck.push({color:c, value:v}); 
    }));
    for(let i=0; i<4; i++){ 
        deck.push({color:"wild", value:"W"}); 
        deck.push({color:"wild4", value:"+4"}); 
    }
    deck.sort(() => Math.random() - 0.5);
}

function formatValue(v) {
    if (v === "skip") return "Ø";
    if (v === "reverse") return "⇄";
    if (v === "draw2") return "+2";
    return v;
}

function hasValidMoves() {
    return playerHand.some(card => 
        card.color === currentColor || card.value === topCard.value || card.color.includes("wild")
    );
}

function renderGame() {
    document.getElementById("playerBadge").innerText = `LE TUE CARTE: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVVERSARIO: ${opponentHand.length}`;
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO AVVERSARIO";

    // Pulsante MasterUno intelligente
    const unoBtn = document.getElementById("masterUnoBtn");
    if(playerHand.length === 2 && isMyTurn && hasValidMoves()) unoBtn.classList.remove("hidden");
    else unoBtn.classList.add("hidden");

    // Render Mano Player
    const pHand = document.getElementById("playerHand"); pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        const val = formatValue(card.value);
        div.className = `card ${card.color}`;
        div.innerText = val;
        div.setAttribute('data-val', val);
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    // Render Mano Opponent
    const oHand = document.getElementById("opponentHand"); oHand.innerHTML = "";
    opponentHand.forEach(() => { 
        oHand.innerHTML += `<div class="card-back-classic" style="width:80px; height:115px; margin: 0 -22px;">MASTER<br>UNO</div>`; 
    });

    // Scarto
    const discard = document.getElementById("discardPile");
    const topVal = formatValue(topCard.value);
    discard.innerHTML = `<div class="card ${currentColor}" data-val="${topVal}" style="margin:0;">${topVal}</div>`;
}

function applyEffects(card, isBotPlayed) {
    let skipOpponent = false;

    if (card.value === "draw2") {
        for(let i=0; i<2; i++) (isBotPlayed ? playerHand : opponentHand).push(deck.pop());
        skipOpponent = true;
    } else if (card.value === "skip" || card.value === "reverse") {
        skipOpponent = true;
    } else if (card.value === "+4") {
        for(let i=0; i<4; i++) (isBotPlayed ? playerHand : opponentHand).push(deck.pop());
        skipOpponent = true;
    }

    if (skipOpponent) {
        isMyTurn = !isBotPlayed; // Mantiene il turno a chi ha giocato
        renderGame();
        if (isBotPlayed) setTimeout(botTurn, 1000);
    } else {
        isMyTurn = isBotPlayed; // Passa il turno normalmente
        if (!isMyTurn) setTimeout(botTurn, 1200);
        renderGame();
    }
    
    if(conn && conn.open) conn.send({type:"SYNC", topCard, currentColor, oppHandSize: playerHand.length, isNextTurn: isMyTurn});
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];

    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        if(playerHand.length === 2 && !hasSaidUno) {
            alert("NON HAI DETTO MASTERUNO! +2 carte");
            playerHand.push(deck.pop(), deck.pop());
            isMyTurn = false;
            renderGame();
            setTimeout(botTurn, 1000);
            return;
        }

        playerHand.splice(i, 1);
        topCard = card;
        hasSaidUno = false;

        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            applyEffects(card, false);
        }
        renderGame();
    }
}

function botTurn() {
    if (isMyTurn) return;
    const idx = opponentHand.findIndex(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));
    
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.color.includes("wild")) currentColor = colors[Math.floor(Math.random()*4)];
        else currentColor = card.color;
        applyEffects(card, true);
    } else {
        opponentHand.push(deck.pop());
        isMyTurn = true;
        renderGame();
    }
}

function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck();
    playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++) { playerHand.push(deck.pop()); opponentHand.push(deck.pop()); }
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;
    isMyTurn = me;
    renderGame();
}

// Pulsante MasterUno
document.getElementById("masterUnoBtn").onclick = () => {
    hasSaidUno = true;
    alert("HAI DETTO MASTERUNO!");
    document.getElementById("masterUnoBtn").classList.add("hidden");
};

// Deck pesca
document.getElementById("deck").onclick = () => {
    if(isMyTurn) {
        playerHand.push(deck.pop());
        isMyTurn = false;
        renderGame();
        setTimeout(botTurn, 1000);
    }
};

document.getElementById("playBotBtn").onclick = () => startG(true);
document.getElementById("copyBtn").onclick = () => { navigator.clipboard.writeText(document.getElementById("myPeerId").innerText); alert("Copiato!"); };
window.setWildColor = (c) => { currentColor = c; document.getElementById("colorPicker").classList.add("hidden"); applyEffects(topCard, false); };
