const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, stackCount = 0, saidMasterUno = false, peer, conn;

// Inizializzazione PeerJS
const myId = Math.random().toString(36).substr(2, 5).toUpperCase();
peer = new Peer(myId);
peer.on('open', id => document.getElementById("myPeerId").innerText = id);
peer.on('connection', c => { conn = c; conn.on('open', () => { setupConn(); startG(false); }); });

function setupConn() {
    conn.on('data', d => {
        if (d.type === "SYNC") {
            topCard = d.topCard; currentColor = d.currentColor; stackCount = d.stackCount;
            isMyTurn = d.isNextTurn; opponentHand = new Array(d.oppHandSize).fill({});
            renderGame();
            if(d.oppHandSize === 0) showEndScreen("bot");
        }
    });
}

function createDeck() {
    deck = [];
    colors.forEach(c => { values.forEach(v => { deck.push({color:c, value:v}); deck.push({color:c, value:v}); }); });
    for(let i=0; i<4; i++){ deck.push({color:"wild", value:"wild"}); deck.push({color:"wild4", value:"+4"}); }
    deck.sort(() => Math.random() - 0.5);
}

function drawCard(hand, count = 1) {
    for(let i=0; i<count; i++){ if(deck.length===0) createDeck(); hand.push(deck.pop()); }
}

function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck(); playerHand = []; opponentHand = [];
    drawCard(playerHand, 7); drawCard(opponentHand, 7);
    topCard = deck.pop(); while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color; isMyTurn = me; renderGame();
}

function renderGame() {
    document.getElementById("playerBadge").innerText = `TU: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVV: ${opponentHand.length}`;
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 TOCCA A TE" : "🔴 TURNO AVVERSARIO";

    const pHand = document.getElementById("playerHand");
    pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color}`;
        const img = card.color.includes("wild") ? (card.value === "+4" ? "wild_draw4" : "wild") : `${card.color}_${card.value}`;
        div.style.backgroundImage = `url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${img}.png')`;
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    const oHand = document.getElementById("opponentHand");
    oHand.innerHTML = "";
    opponentHand.forEach(() => { oHand.innerHTML += `<div class="card-back-master">MASTER<br>UNO</div>`; });

    const discard = document.getElementById("discardPile");
    const topImg = topCard.color.includes("wild") ? (topCard.value === "+4" ? "wild_draw4" : "wild") : `${topCard.color}_${topCard.value}`;
    discard.innerHTML = `<div class="card ${topCard.color}" style="background-image: url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${topImg}.png')"></div>`;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    const canStack = (stackCount > 0 && (card.value === topCard.value || card.value === "+4"));
    const normalPlay = (stackCount === 0 && (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")));

    if (canStack || normalPlay) {
        playerHand.splice(i, 1);
        topCard = card;
        if (card.value === "draw2") stackCount += 2; 
        else if (card.value === "+4") stackCount += 4;

        if (card.color.includes("wild")) {
            renderGame();
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            checkEnd(card.value === "skip" || card.value === "reverse");
        }
    }
}

window.setWildColor = function(c) {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    checkEnd(false);
};

function checkEnd(extra) {
    if (playerHand.length === 0) { showEndScreen("player"); return; }
    isMyTurn = stackCount > 0 ? false : extra;
    if (conn && conn.open) conn.send({ type: "SYNC", topCard, currentColor, stackCount, oppHandSize: playerHand.length, isNextTurn: !isMyTurn });
    renderGame();
    if (!isMyTurn && !conn) setTimeout(botTurn, 1000);
}

function botTurn() {
    const idx = opponentHand.findIndex(c => (stackCount > 0 ? (c.value === topCard.value || c.value === "+4") : (c.color === currentColor || c.value === topCard.value || c.color.includes("wild"))));
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") stackCount += 2; else if (card.value === "+4") stackCount += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        if (opponentHand.length === 0) { showEndScreen("bot"); return; }
        isMyTurn = (card.value === "skip" || card.value === "reverse") ? false : true;
        if (!isMyTurn) setTimeout(botTurn, 1000);
    } else {
        drawCard(opponentHand, stackCount > 0 ? stackCount : 1);
        stackCount = 0; isMyTurn = true;
    }
    renderGame();
}

function showEndScreen(w) {
    document.getElementById("gameArea").classList.add("hidden");
    document.getElementById("endScreen").classList.remove("hidden");
    document.getElementById("endMessage").innerText = w === "player" ? "🏆 HAI VINTO!" : "💀 HAI PERSO!";
}

// Eventi pulsanti iniziali
document.getElementById("playBotBtn").onclick = () => startG(true);
document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(document.getElementById("myPeerId").innerText);
};
document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    drawCard(playerHand, stackCount > 0 ? stackCount : 1);
    stackCount = 0; isMyTurn = false;
    if (conn && conn.open) conn.send({ type: "SYNC", topCard, currentColor, stackCount, oppHandSize: playerHand.length, isNextTurn: true });
    renderGame();
    if (!conn) setTimeout(botTurn, 1000);
};
