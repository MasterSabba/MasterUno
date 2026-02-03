const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "", isMyTurn = true;
let peer, conn;

// Immagini
function getCardImg(c, v) {
    if (c.includes("wild")) return `https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${c === "wild4" ? "wild_draw4" : "wild"}.png`;
    return `https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${c}_${v}.png`;
}

function createDeck() {
    deck = [];
    colors.forEach(c => {
        values.forEach(v => {
            deck.push({ color: c, value: v });
            if (v !== "0") deck.push({ color: c, value: v });
        });
    });
    for (let i = 0; i < 4; i++) {
        deck.push({ color: "wild", value: "wild" });
        deck.push({ color: "wild4", value: "+4" });
    }
    deck.sort(() => Math.random() - 0.5);
}

function drawCard(hand) {
    if (deck.length === 0) createDeck();
    const card = deck.pop();
    hand.push(card);
    return card;
}

function checkWin() {
    if (playerHand.length === 0) { alert("🎉 HAI VINTO!"); location.reload(); return true; }
    if (opponentHand.length === 0) { alert("💀 HAI PERSO!"); location.reload(); return true; }
    return false;
}

function renderGame() {
    const pHand = document.getElementById("playerHand");
    const oHand = document.getElementById("opponentHand");
    const disc = document.getElementById("discardPile");

    // Badge distanziati
    pHand.innerHTML = `<div class="badge">TU<br>${playerHand.length}</div>`;
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color} clickable`;
        div.style.backgroundImage = `url('${getCardImg(card.color, card.value)}')`;
        div.innerHTML = `<span>${card.value}</span>`;
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    oHand.innerHTML = `<div class="badge">AVV<br>${opponentHand.length}</div>`;
    opponentHand.forEach(() => {
        const div = document.createElement("div");
        div.className = "card-back";
        oHand.appendChild(div);
    });

    disc.innerHTML = `<div class="card ${topCard.color}" style="background-image: url('${getCardImg(topCard.color, topCard.value)}')"><span>${topCard.value}</span></div>`;
    document.getElementById("colorDisplay").innerText = currentColor.toUpperCase();
}

// LOGICA CARTE SPECIALI
function applySpecialEffects(card, isBotAttacking) {
    let target = isBotAttacking ? playerHand : opponentHand;
    let skip = false;

    if (card.value === "draw2") { drawCard(target); drawCard(target); skip = true; }
    else if (card.value === "+4") { for(let i=0; i<4; i++) drawCard(target); skip = true; }
    else if (card.value === "skip" || card.value === "reverse") { skip = true; }
    
    return skip;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];

    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1);
        topCard = card;

        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            const skipNext = applySpecialEffects(card, false);
            endTurn(skipNext);
        }
    }
}

function setWildColor(c) {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    const skipNext = (topCard.value === "+4");
    endTurn(skipNext);
}

function endTurn(skipNext) {
    if (checkWin()) return;
    renderGame();
    if (conn) conn.send({ type: "MOVE", card: topCard, color: currentColor, skip: skipNext });
    
    if (!skipNext) {
        isMyTurn = false;
        if (!conn) setTimeout(botTurn, 1000);
    } else {
        isMyTurn = true; // Salta il turno dell'altro, tocca ancora a me
    }
}

function botTurn() {
    if (isMyTurn) return;
    const idx = opponentHand.findIndex(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));
    
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        const skipBotNext = applySpecialEffects(card, true);
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        
        if (checkWin()) return;
        if (skipBotNext) {
            renderGame();
            setTimeout(botTurn, 1000);
        } else {
            isMyTurn = true;
            renderGame();
        }
    } else {
        drawCard(opponentHand);
        isMyTurn = true;
        renderGame();
    }
}

document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    drawCard(playerHand);
    if (conn) conn.send({ type: "DRAW" });
    isMyTurn = false;
    renderGame();
    if (!conn) setTimeout(botTurn, 1000);
};

// MULTIPLAYER
peer = new Peer();
peer.on('open', id => { document.getElementById("myPeerId").innerText = id; });
peer.on('connection', c => { conn = c; conn.on('data', handleData); startG(false); });

document.getElementById("connectBtn").onclick = () => {
    const id = document.getElementById("friendIdInput").value;
    conn = peer.connect(id);
    conn.on('open', () => {
        conn.on('data', handleData);
        startG(true);
    });
};

function handleData(d) {
    if (d.type === "MOVE") {
        topCard = d.card;
        currentColor = d.color;
        opponentHand.pop();
        isMyTurn = !d.skip;
    } else if (d.type === "DRAW") {
        drawCard(opponentHand);
    }
    checkWin();
    renderGame();
}

function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck();
    playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++) { drawCard(playerHand); drawCard(opponentHand); }
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;
    isMyTurn = me;
    renderGame();
}

document.getElementById("playBotBtn").onclick = () => { conn = null; startG(true); };
