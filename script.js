const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "", isMyTurn = true;
let stackCount = 0, saidMasterUno = false, peer, conn;

// Funzione per i messaggi a scomparsa
function showToast(text) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.innerText = text;
    toast.classList.remove("hidden");
    setTimeout(() => { toast.classList.add("hidden"); }, 1500);
}

// Generazione codice casuale di emergenza
const fallbackId = Math.random().toString(36).substr(2, 5).toUpperCase();

function createDeck() {
    deck = [];
    colors.forEach(c => {
        values.forEach(v => {
            deck.push({ color: c, value: v });
            deck.push({ color: c, value: v });
        });
    });
    for (let i = 0; i < 4; i++) {
        deck.push({ color: "wild", value: "wild" });
        deck.push({ color: "wild4", value: "+4" });
    }
    deck.sort(() => Math.random() - 0.5);
}

function drawCard(hand, count = 1) {
    for (let i = 0; i < count; i++) {
        if (deck.length === 0) createDeck();
        hand.push(deck.pop());
    }
}

function renderGame() {
    const pHand = document.getElementById("playerHand");
    const oHand = document.getElementById("opponentHand");
    const disc = document.getElementById("discardPile");
    const turnInd = document.getElementById("turnIndicator");
    const masterBtn = document.getElementById("masterUnoBtn");

    // Mostra/Nascondi tasto MasterUno
    if (playerHand.length === 1 && !saidMasterUno) masterBtn.classList.remove("hidden");
    else masterBtn.classList.add("hidden");

    turnInd.innerText = isMyTurn ? "🟢 TOCCA A TE" : "🔴 TURNO AVVERSARIO";
    turnInd.style.color = isMyTurn ? "#2ecc71" : "#e74c3c";

    pHand.innerHTML = `<div class="badge">TU: ${playerHand.length}</div>`;
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color} clickable`;
        div.style.backgroundImage = `url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${card.color === "wild" ? "wild" : (card.color === "wild4" ? "wild_draw4" : card.color + "_" + card.value)}.png')`;
        div.innerHTML = `<span>${card.value.toUpperCase()}</span>`;
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    oHand.innerHTML = `<div class="badge">AVV: ${opponentHand.length}</div>`;
    opponentHand.forEach(() => {
        const div = document.createElement("div");
        div.className = "card-back";
        div.innerHTML = "MASTER<br>UNO";
        oHand.appendChild(div);
    });

    const glow = currentColor === "yellow" ? "#f1c40f" : (currentColor === "blue" ? "#3498db" : currentColor);
    disc.innerHTML = `<div class="card ${topCard.color}" style="background-image: url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${topCard.color === "wild" ? "wild" : (topCard.color === "wild4" ? "wild_draw4" : topCard.color + "_" + topCard.value)}.png'); box-shadow: 0 0 35px ${glow}"><span>${topCard.value.toUpperCase()}</span></div>`;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    const canStack = (stackCount > 0 && card.value === topCard.value);
    const normalPlay = (stackCount === 0 && (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")));

    if (canStack || normalPlay) {
        if (playerHand.length !== 2) saidMasterUno = false;
        playerHand.splice(i, 1);
        topCard = card;

        if (card.value === "draw2") stackCount += 2;
        else if (card.value === "+4") stackCount += 4;

        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            let skip = (card.value === "skip" || card.value === "reverse");
            checkEnd(skip);
        }
    }
}

function checkEnd(skip) {
    if (playerHand.length === 0) {
        if (!saidMasterUno) {
            showToast("❌ PENALITÀ! +2 CARTE");
            drawCard(playerHand, 2);
            isMyTurn = false;
        } else {
            showEndScreen("player");
            return;
        }
    } else {
        isMyTurn = stackCount > 0 ? false : skip;
    }
    if (conn) conn.send({ type: "SYNC", topCard, currentColor, stackCount, oppHandSize: playerHand.length, isNextTurn: !isMyTurn });
    renderGame();
    if (!isMyTurn && !conn) setTimeout(botTurn, 1000);
}

function botTurn() {
    if (isMyTurn) return;
    const idx = opponentHand.findIndex(c => {
        if (stackCount > 0) return c.value === topCard.value;
        return c.color === currentColor || c.value === topCard.value || c.color.includes("wild");
    });

    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") stackCount += 2; else if (card.value === "+4") stackCount += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        if (opponentHand.length === 0) { showEndScreen("bot"); return; }
        let botAgain = (card.value === "skip" || card.value === "reverse");
        if (botAgain && stackCount === 0) setTimeout(botTurn, 1000); else isMyTurn = true;
    } else {
        if (stackCount > 0) { drawCard(opponentHand, stackCount); stackCount = 0; }
        else drawCard(opponentHand);
        isMyTurn = true;
    }
    renderGame();
}

function showEndScreen(winner) {
    document.getElementById("endScreen").classList.remove("hidden");
    const msg = document.getElementById("endMessage");
    msg.innerText = winner === "player" ? "🏆 HAI VINTO!" : "💀 HAI PERSO!";
    msg.style.color = winner === "player" ? "#f1c40f" : "#e74c3c";
    if (winner === "player" && typeof confetti === "function") confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
}

// Inizializzazione Partita
function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck();
    playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++) { drawCard(playerHand); drawCard(opponentHand); }
    topCard = deck.pop(); while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;
    isMyTurn = me;
    renderGame();
}

// Pulsanti Menu
document.getElementById("playBotBtn").onclick = () => { conn = null; startG(true); };
document.getElementById("masterUnoBtn").onclick = () => { saidMasterUno = true; showToast("📢 MASTERUNO!"); renderGame(); };
document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    drawCard(playerHand, stackCount > 0 ? stackCount : 1);
    stackCount = 0; saidMasterUno = false; isMyTurn = false;
    checkEnd(false);
};

window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    checkEnd(false);
};

// PeerJS - Gestione Codice e Connessione
try {
    peer = new Peer(fallbackId);
    peer.on('open', id => { document.getElementById("myPeerId").innerText = id; });
    peer.on('error', () => { document.getElementById("myPeerId").innerText = fallbackId; });
    peer.on('connection', c => {
        conn = c;
        conn.on('data', d => {
            topCard = d.topCard; currentColor = d.currentColor; stackCount = d.stackCount;
            isMyTurn = d.isNextTurn; opponentHand = new Array(d.oppHandSize).fill({});
            renderGame();
        });
        startG(false);
    });
} catch(e) {
    document.getElementById("myPeerId").innerText = fallbackId;
}

document.getElementById("connectBtn").onclick = () => {
    const val = document.getElementById("friendIdInput").value;
    if(!val) return alert("Inserisci un codice!");
    conn = peer.connect(val.toUpperCase());
    conn.on('open', () => startG(true));
};
