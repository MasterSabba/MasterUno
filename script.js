const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, stackCount = 0, saidMasterUno = false, peer, conn;

function showToast(text) {
    const toast = document.getElementById("toastNotification");
    toast.innerText = text; toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 2500);
}

// FIX COPIA CODICE
document.getElementById("copyBtn").onclick = () => {
    const text = document.getElementById("myPeerId").innerText;
    const el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el);
    el.select(); document.execCommand('copy');
    document.body.removeChild(el);
    showToast("📋 Codice copiato!");
};

function createDeck() {
    deck = [];
    colors.forEach(c => { values.forEach(v => { deck.push({color:c, value:v}); deck.push({color:c, value:v}); }); });
    for(let i=0; i<4; i++){ deck.push({color:"wild", value:"wild"}); deck.push({color:"wild4", value:"+4"}); }
    deck.sort(() => Math.random() - 0.5);
}

function drawCard(hand, count = 1) {
    for(let i=0; i<count; i++){ if(deck.length===0) createDeck(); hand.push(deck.pop()); }
}

function renderGame() {
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 TOCCA A TE" : "🔴 TURNO AVVERSARIO";
    document.getElementById("masterUnoBtn").classList.toggle("hidden", !(playerHand.length === 1 && !saidMasterUno));

    const pHand = document.getElementById("playerHand");
    pHand.innerHTML = `<div class="badge">TU: ${playerHand.length}</div>`;
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color} clickable`;
        const img = card.color.includes("wild") ? (card.value === "+4" ? "wild_draw4" : "wild") : `${card.color}_${card.value}`;
        div.style.backgroundImage = `url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${img}.png')`;
        div.innerHTML = `<span>${card.color.includes("wild") ? "" : card.value.toUpperCase()}</span>`;
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    const oHand = document.getElementById("opponentHand");
    oHand.innerHTML = `<div class="badge">AVV: ${opponentHand.length}</div>`;
    opponentHand.forEach(() => { oHand.innerHTML += `<div class="card-back">MASTER<br>UNO</div>`; });

    const topImg = topCard.color.includes("wild") ? (topCard.value === "+4" ? "wild_draw4" : "wild") : `${topCard.color}_${topCard.value}`;
    document.getElementById("discardPile").innerHTML = `<div class="card ${topCard.color}" style="background-image: url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${topImg}.png')"><span>${topCard.color.includes("wild") ? "" : topCard.value.toUpperCase()}</span></div>`;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    const canStack = (stackCount > 0 && card.value === topCard.value);
    const normalPlay = (stackCount === 0 && (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")));

    if (canStack || normalPlay) {
        playerHand.splice(i, 1);
        topCard = card;
        if (card.value === "draw2") stackCount += 2; else if (card.value === "+4") stackCount += 4;
        
        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            // Se è skip o reverse, il turno RESTA a me
            const extra = (card.value === "skip" || card.value === "reverse");
            checkEnd(extra);
        }
    }
}

function checkEnd(extra) {
    if (playerHand.length === 0) {
        if (!saidMasterUno) {
            showToast("❌ NO MASTERUNO! +2"); drawCard(playerHand, 2); isMyTurn = false;
        } else { showEndScreen("player"); sendSync(true); return; }
    } else {
        isMyTurn = stackCount > 0 ? false : extra;
        if (playerHand.length > 1) saidMasterUno = false;
    }
    sendSync(); renderGame();
    if (!isMyTurn && !conn) setTimeout(botTurn, 1000);
}

function sendSync(won = false, alert = false) {
    if (conn && conn.open) conn.send({ type: "SYNC", topCard, currentColor, stackCount, oppHandSize: won ? 0 : playerHand.length, isNextTurn: !isMyTurn, masterAlert: alert });
}

function setupConn() {
    conn.on('data', d => {
        if (d.type === "SYNC") {
            if (d.masterAlert) showToast("📢 L'AVVERSARIO HA DETTO MASTERUNO!");
            topCard = d.topCard; currentColor = d.currentColor; stackCount = d.stackCount;
            isMyTurn = d.isNextTurn; opponentHand = new Array(d.oppHandSize).fill({});
            renderGame();
            if(d.oppHandSize === 0) showEndScreen("bot");
        }
    });
}

function showEndScreen(w) {
    document.getElementById("gameArea").classList.add("hidden");
    document.getElementById("endScreen").classList.remove("hidden");
    const msg = document.getElementById("endMessage");
    msg.innerText = w === "player" ? "🏆 HAI VINTO!" : "💀 HAI PERSO!";
    if (w === "player") confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
}

const myId = Math.random().toString(36).substr(2, 5).toUpperCase();
peer = new Peer(myId);
peer.on('open', id => document.getElementById("myPeerId").innerText = id);
peer.on('connection', c => { conn = c; conn.on('open', () => { setupConn(); startG(false); setTimeout(sendSync, 500); }); });

document.getElementById("playBotBtn").onclick = () => { conn = null; startG(true); };
document.getElementById("connectBtn").onclick = () => {
    const val = document.getElementById("friendIdInput").value.toUpperCase();
    if(!val) return;
    conn = peer.connect(val);
    conn.on('open', () => { setupConn(); startG(true); });
};

function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck(); playerHand = []; opponentHand = [];
    drawCard(playerHand, 7); drawCard(opponentHand, 7);
    topCard = deck.pop(); while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color; isMyTurn = me; renderGame();
}

document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    drawCard(playerHand, stackCount > 0 ? stackCount : 1);
    stackCount = 0; saidMasterUno = false; isMyTurn = false;
    sendSync(); renderGame(); if(!conn) setTimeout(botTurn, 1000);
};

document.getElementById("masterUnoBtn").onclick = () => { saidMasterUno = true; showToast("📢 MASTERUNO!"); sendSync(false, true); renderGame(); };

window.setWildColor = (c) => { 
    currentColor = c; 
    document.getElementById("colorPicker").classList.add("hidden"); 
    checkEnd(false); 
};

function botTurn() {
    const idx = opponentHand.findIndex(c => (stackCount > 0 ? c.value === topCard.value : (c.color === currentColor || c.value === topCard.value || c.color.includes("wild"))));
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") stackCount += 2; else if (card.value === "+4") stackCount += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        if (opponentHand.length === 0) { showEndScreen("bot"); return; }
        isMyTurn = (card.value === "skip" || card.value === "reverse") ? false : true;
    } else {
        if (stackCount > 0) { drawCard(opponentHand, stackCount); stackCount = 0; }
        else drawCard(opponentHand);
        isMyTurn = true;
    }
    renderGame();
}
