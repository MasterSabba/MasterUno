const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, stackCount = 0, peer, conn;

// 1. INIZIALIZZAZIONE PEER (PER IL CODICE INVITO)
const initPeer = () => {
    const myId = Math.random().toString(36).substr(2, 5).toUpperCase();
    peer = new Peer(myId);
    peer.on('open', id => {
        document.getElementById("myPeerId").innerText = id;
    });
    peer.on('connection', c => {
        conn = c;
        conn.on('open', () => {
            setupConn();
            startG(false); // Inizia come secondo giocatore
        });
    });
};
initPeer();

function setupConn() {
    conn.on('data', d => {
        if (d.type === "SYNC") {
            topCard = d.topCard; 
            currentColor = d.currentColor; 
            isMyTurn = d.isNextTurn; 
            opponentHand = new Array(d.oppHandSize).fill({});
            renderGame();
        }
    });
}

// 2. LOGICA MAZZO
function createDeck() {
    deck = [];
    colors.forEach(c => {
        values.forEach(v => {
            deck.push({color: c, value: v});
            deck.push({color: c, value: v});
        });
    });
    for(let i=0; i<4; i++) {
        deck.push({color: "wild", value: "wild"});
        deck.push({color: "wild4", value: "+4"});
    }
    deck.sort(() => Math.random() - 0.5);
}

// 3. INIZIO GIOCO
function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck();
    playerHand = [];
    opponentHand = [];
    // Distribuisci 7 carte
    for(let i=0; i<7; i++) {
        playerHand.push(deck.pop());
        opponentHand.push(deck.pop());
    }
    // Prima carta valida (non speciale)
    topCard = deck.pop();
    while(topCard.color.includes("wild")) {
        deck.push(topCard);
        deck.sort(() => Math.random() - 0.5);
        topCard = deck.pop();
    }
    currentColor = topCard.color;
    isMyTurn = me;
    renderGame();
}

// 4. DISEGNA INTERFACCIA (VERTICALE)
function renderGame() {
    document.getElementById("playerBadge").innerText = `LE TUE CARTE: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVVERSARIO: ${opponentHand.length}`;
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO AVVERSARIO";

    // Mano Giocatore (Sotto)
    const pHand = document.getElementById("playerHand");
    pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color}`;
        const imgName = card.color.includes("wild") ? (card.value === "+4" ? "wild_draw4" : "wild") : `${card.color}_${card.value}`;
        div.style.backgroundImage = `url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${imgName}.png')`;
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    // Mano Avversario (Sopra)
    const oHand = document.getElementById("opponentHand");
    oHand.innerHTML = "";
    opponentHand.forEach(() => {
        const div = document.createElement("div");
        div.className = "card-back-classic";
        div.style.width = "80px";
        div.style.height = "115px";
        div.style.margin = "0 -20px";
        div.innerHTML = "MASTER<br>UNO";
        oHand.appendChild(div);
    });

    // Scarti (Centro)
    const discard = document.getElementById("discardPile");
    const topImg = topCard.color.includes("wild") ? (topCard.value === "+4" ? "wild_draw4" : "wild") : `${topCard.color}_${topCard.value}`;
    discard.innerHTML = `<div class="card ${topCard.color}" style="background-image: url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${topImg}.png'); margin:0;"></div>`;
}

// 5. AZIONE GIOCA CARTA
function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    
    // Regola base: stesso colore, stesso valore o jolly
    const canPlay = (card.color === currentColor || card.value === topCard.value || card.color.includes("wild"));
    
    if (canPlay) {
        playerHand.splice(i, 1);
        topCard = card;
        
        if (card.color.includes("wild")) {
            // MOSTRA IL PICKER COLORI
            document.getElementById("colorPicker").classList.remove("hidden");
            renderGame();
        } else {
            currentColor = card.color;
            finishTurn();
        }
    }
}

// 6. SCELTA COLORE JOLLY
window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    finishTurn();
};

function finishTurn() {
    if (playerHand.length === 0) {
        confetti();
        alert("VITTORIA SCHIACCIANTE!");
        location.reload();
        return;
    }
    isMyTurn = false;
    renderGame();
    
    if (conn && conn.open) {
        conn.send({
            type: "SYNC",
            topCard,
            currentColor,
            oppHandSize: playerHand.length,
            isNextTurn: true
        });
    } else {
        setTimeout(botTurn, 1200);
    }
}

// 7. INTELLIGENZA BOT
function botTurn() {
    const idx = opponentHand.findIndex(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));
    
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.color.includes("wild")) {
            currentColor = colors[Math.floor(Math.random() * 4)];
        } else {
            currentColor = card.color;
        }
        if (opponentHand.length === 0) {
            alert("IL COMPUTER HA VINTO!");
            location.reload();
            return;
        }
    } else {
        // Pesca se non può giocare
        if (deck.length === 0) createDeck();
        opponentHand.push(deck.pop());
    }
    
    isMyTurn = true;
    renderGame();
}

// 8. EVENTI PULSANTI
document.getElementById("playBotBtn").onclick = () => startG(true);

document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    if (deck.length === 0) createDeck();
    playerHand.push(deck.pop());
    isMyTurn = false;
    renderGame();
    if (!conn) setTimeout(botTurn, 1000);
    else conn.send({type: "SYNC", topCard, currentColor, oppHandSize: playerHand.length, isNextTurn: true});
};

document.getElementById("copyBtn").onclick = () => {
    const idText = document.getElementById("myPeerId").innerText;
    navigator.clipboard.writeText(idText);
    alert("Codice copiato: " + idText);
};

document.getElementById("connectBtn").onclick = () => {
    const id = document.getElementById("friendIdInput").value.toUpperCase();
    if (id) {
        conn = peer.connect(id);
        conn.on('open', () => {
            setupConn();
            startG(true);
        });
    }
};
