const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "", isMyTurn = true;
let peer, conn;

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

function renderGame() {
    const pHand = document.getElementById("playerHand");
    const oHand = document.getElementById("opponentHand");
    const disc = document.getElementById("discardPile");

    pHand.innerHTML = `<div class="badge">TU<br>${playerHand.length}</div>`;
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color}`;
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

function checkWin() {
    if (playerHand.length === 0) { alert("🎉 HAI VINTO!"); location.reload(); }
    if (opponentHand.length === 0) { alert("💀 HAI PERSO!"); location.reload(); }
}

function handleSpecialEffect(card, targetIsBot) {
    let targetHand = targetIsBot ? opponentHand : playerHand;
    if (card.value === "draw2") { drawCard(targetHand); drawCard(targetHand); return true; }
    if (card.value === "+4") { for(let i=0; i<4; i++) drawCard(targetHand); return true; }
    if (card.value === "skip" || card.value === "reverse") return true;
    return false;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1);
        topCard = card;
        let skipNext = handleSpecialEffect(card, true);
        
        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            finishTurn(skipNext);
        }
    }
}

function setWildColor(c) {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    finishTurn(topCard.value === "+4");
}

function finishTurn(skipNext) {
    checkWin();
    if (conn) conn.send({ type: "MOVE", card: topCard, color: currentColor, skip: skipNext });
    isMyTurn = skipNext; 
    renderGame();
    if (!isMyTurn && !conn) setTimeout(botTurn, 1000);
}

function botTurn() {
    const idx = opponentHand.findIndex(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        let skipBotNext = handleSpecialEffect(card, false);
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        checkWin();
        if (skipBotNext) setTimeout(botTurn, 1000); else isMyTurn = true;
    } else {
        drawCard(opponentHand); isMyTurn = true;
    }
    renderGame();
}

document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    drawCard(playerHand);
    if (conn) conn.send({ type: "DRAW" });
    isMyTurn = false;
    renderGame();
    if (!conn) setTimeout(botTurn, 1000);
};

// MULTIPLAYER PEERJS
peer = new Peer();
peer.on('open', id => { 
    document.getElementById("myPeerId").innerText = id;
    document.getElementById("myPeerId").onclick = () => { navigator.clipboard.writeText(id); alert("Copiato!"); };
});
peer.on('connection', c => { conn = c; setupConn(); startG(false); });
document.getElementById("connectBtn").onclick = () => {
    conn = peer.connect(document.getElementById("friendIdInput").value);
    setupConn();
    conn.on('open', () => startG(true));
};
function setupConn() {
    conn.on('data', d => {
        if (d.type === "MOVE") { topCard = d.card; currentColor = d.color; opponentHand.pop(); isMyTurn = !d.skip; }
        if (d.type === "DRAW") drawCard(opponentHand);
        checkWin(); renderGame();
    });
}
function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck(); playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++) { drawCard(playerHand); drawCard(opponentHand); }
    topCard = deck.pop(); while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color; isMyTurn = me; renderGame();
}
document.getElementById("playBotBtn").onclick = () => { conn = null; startG(true); };
