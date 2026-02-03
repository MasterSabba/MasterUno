const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, peer, conn;

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
    colors.forEach(c => values.forEach(v => { deck.push({color:c, value:v}); deck.push({color:c, value:v}); }));
    for(let i=0; i<4; i++){ deck.push({color:"wild", value:"wild"}); deck.push({color:"wild4", value:"+4"}); }
    deck.sort(() => Math.random() - 0.5);
}

function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck();
    playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++) { playerHand.push(deck.pop()); opponentHand.push(deck.pop()); }
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color; isMyTurn = me; renderGame();
}

function renderGame() {
    document.getElementById("playerBadge").innerText = `LE TUE CARTE: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVVERSARIO: ${opponentHand.length}`;
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO AVVERSARIO";

    const pHand = document.getElementById("playerHand"); pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color}`;
        const img = card.color.includes("wild") ? (card.value === "+4" ? "wild_draw4" : "wild") : `${card.color}_${card.value}`;
        div.style.backgroundImage = `url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${img}.png')`;
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    const oHand = document.getElementById("opponentHand"); oHand.innerHTML = "";
    opponentHand.forEach(() => { 
        oHand.innerHTML += `<div class="card-back-classic" style="width:80px; height:115px; margin: 0 -20px;">MASTER<br>UNO</div>`; 
    });

    const discard = document.getElementById("discardPile");
    const topImg = topCard.color.includes("wild") ? (topCard.value === "+4" ? "wild_draw4" : "wild") : `${topCard.color}_${topCard.value}`;
    discard.innerHTML = `<div class="card ${topCard.color}" style="background-image: url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${topImg}.png'); margin:0;"></div>`;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1); topCard = card;
        if (card.color.includes("wild")) { document.getElementById("colorPicker").classList.remove("hidden"); }
        else { currentColor = card.color; finishTurn(); }
        renderGame();
    }
}

window.setWildColor = (c) => {
    currentColor = c; document.getElementById("colorPicker").classList.add("hidden"); finishTurn();
};

function finishTurn() {
    if (playerHand.length === 0) { confetti(); alert("VITTORIA!"); location.reload(); return; }
    isMyTurn = false; renderGame();
    if(conn && conn.open) conn.send({type:"SYNC", topCard, currentColor, oppHandSize: playerHand.length, isNextTurn: true});
    else setTimeout(botTurn, 1000);
}

function botTurn() {
    const idx = opponentHand.findIndex(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0]; topCard = card;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
    } else { if(deck.length === 0) createDeck(); opponentHand.push(deck.pop()); }
    isMyTurn = true; renderGame();
}

document.getElementById("playBotBtn").onclick = () => startG(true);
document.getElementById("deck").onclick = () => { if(isMyTurn) { if(deck.length === 0) createDeck(); playerHand.push(deck.pop()); finishTurn(); }};
document.getElementById("copyBtn").onclick = () => { navigator.clipboard.writeText(document.getElementById("myPeerId").innerText); alert("Copiato!"); };
document.getElementById("connectBtn").onclick = () => {
    const id = document.getElementById("friendIdInput").value.toUpperCase();
    if (id) { conn = peer.connect(id); conn.on('open', () => { setupConn(); startG(true); }); }
};
