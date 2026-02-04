const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, peer, conn;

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

function showAutoAlert(txt) {
    const a = document.createElement("div");
    a.id = "autoAlert"; a.innerText = txt;
    document.body.appendChild(a);
    setTimeout(() => a.remove(), 1500);
}

function renderGame() {
    if (playerHand.length === 0 && deck.length < 100) { // Controllo vittoria
        confetti();
        alert("🎉 VITTORIA! SEI IL MASTER DI UNO!");
        location.reload();
        return;
    }

    document.getElementById("playerBadge").innerText = `CARTE: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVVERSARIO: ${opponentHand.length}`;
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO AVVERSARIO";

    const unoBtn = document.getElementById("masterUnoBtn");
    const canPlay = playerHand.some(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));
    if(playerHand.length === 2 && isMyTurn && canPlay) unoBtn.classList.remove("hidden");
    else unoBtn.classList.add("hidden");

    const pHand = document.getElementById("playerHand"); pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        const v = card.value === "skip" ? "Ø" : (card.value === "reverse" ? "⇄" : (card.value === "draw2" ? "+2" : card.value));
        div.className = `card ${card.color}`;
        div.innerText = v; div.setAttribute('data-val', v);
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    const oHand = document.getElementById("opponentHand"); oHand.innerHTML = "";
    opponentHand.forEach(() => { oHand.innerHTML += `<div class="card-back-classic" style="margin: 0 -22px;">MASTER<br>UNO</div>`; });

    const discard = document.getElementById("discardPile");
    const topV = topCard.value === "skip" ? "Ø" : (topCard.value === "reverse" ? "⇄" : (topCard.value === "draw2" ? "+2" : topCard.value));
    discard.innerHTML = `<div class="card ${currentColor}" data-val="${topV}" style="margin:0;">${topV}</div>`;
}

function applyEffects(card, isBot) {
    let skip = false;
    if (card.value === "draw2") { for(let i=0; i<2; i++) (isBot?playerHand:opponentHand).push(deck.pop()); skip = true; }
    else if (card.value === "skip" || card.value === "reverse") skip = true;
    else if (card.value === "+4") { for(let i=0; i<4; i++) (isBot?playerHand:opponentHand).push(deck.pop()); skip = true; }

    if (skip) { isMyTurn = !isBot; renderGame(); if(isBot) setTimeout(botTurn, 1000); }
    else { isMyTurn = isBot; renderGame(); if(!isMyTurn) setTimeout(botTurn, 1200); }
    
    if(conn && conn.open) conn.send({type:"SYNC", topCard, currentColor, oppHandSize: playerHand.length, isNextTurn: isMyTurn});
}

function playCard(i) {
    if (!isMyTurn) return;
    if(playerHand.length === 2 && !hasSaidUno) {
        showAutoAlert("PENALITÀ! NON HAI DETTO MASTERUNO");
        playerHand.push(deck.pop(), deck.pop());
        isMyTurn = false; renderGame(); setTimeout(botTurn, 1000); return;
    }
    const card = playerHand[i];
    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1); topCard = card; hasSaidUno = false;
        if (card.color.includes("wild")) document.getElementById("colorPicker").classList.remove("hidden");
        else { currentColor = card.color; applyEffects(card, false); }
        renderGame();
    }
}

window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    showAutoAlert("NUOVO COLORE: " + c.toUpperCase());
    applyEffects(topCard, false);
};

function botTurn() {
    if (isMyTurn) return;
    const idx = opponentHand.findIndex(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0]; topCard = card;
        if (card.color.includes("wild")) currentColor = colors[Math.floor(Math.random()*4)];
        else currentColor = card.color;
        if (opponentHand.length === 0) { alert("IL BOT HA VINTO!"); location.reload(); }
        applyEffects(card, true);
    } else { opponentHand.push(deck.pop()); isMyTurn = true; renderGame(); }
}

function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck(); playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++) { playerHand.push(deck.pop()); opponentHand.push(deck.pop()); }
    topCard = deck.pop(); while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color; isMyTurn = me; renderGame();
}

document.getElementById("masterUnoBtn").onclick = () => { hasSaidUno = true; showAutoAlert("MASTERUNO! 🔥"); };
document.getElementById("playBotBtn").onclick = () => startG(true);
document.getElementById("deck").onclick = () => { if(isMyTurn) { playerHand.push(deck.pop()); isMyTurn = false; renderGame(); setTimeout(botTurn, 1000); }};
document.getElementById("copyBtn").onclick = () => { navigator.clipboard.writeText(document.getElementById("myPeerId").innerText); showAutoAlert("ID COPIATO!"); };
document.getElementById("connectBtn").onclick = () => {
    const id = document.getElementById("friendIdInput").value.toUpperCase();
    if (id) { conn = peer.connect(id); conn.on('open', () => { setupConn(); startG(true); }); }
};
