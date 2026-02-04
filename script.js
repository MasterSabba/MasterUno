const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, drawStack = 0, peer, conn;

const initPeer = () => {
    const id = Math.random().toString(36).substr(2, 5).toUpperCase();
    peer = new Peer(id);
    peer.on('open', res => document.getElementById("myPeerId").innerText = res);
    peer.on('connection', c => { conn = c; conn.on('open', () => startG(false)); });
};
initPeer();

function showAutoAlert(txt) {
    const a = document.createElement("div"); a.id = "autoAlert"; a.innerText = txt;
    document.body.appendChild(a);
    setTimeout(() => a.remove(), 1500);
}

function showEndScreen(win) {
    const screen = document.createElement("div");
    screen.id = "endScreen";
    const title = win ? "HAI VINTO!" : "HAI PERSO!";
    const cls = win ? "win-text" : "lose-text";
    screen.innerHTML = `<h1 class="end-title ${cls}">${title}</h1>`;
    document.body.appendChild(screen);
    if (win) confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
    setTimeout(() => location.reload(), 3500);
}

function createDeck() {
    deck = [];
    colors.forEach(c => values.forEach(v => { deck.push({color:c, value:v}); if(v!=="0") deck.push({color:c, value:v}); }));
    for(let i=0; i<4; i++){ deck.push({color:"wild", value:"W"}); deck.push({color:"wild4", value:"wild4"}); }
    deck.sort(() => Math.random() - 0.5);
}

function renderGame() {
    if (playerHand.length === 0) { showEndScreen(true); return; }
    if (opponentHand.length === 0) { showEndScreen(false); return; }

    document.getElementById("playerBadge").innerText = `TU: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `BOT: ${opponentHand.length}`;
    
    let turnTxt = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO AVVERSARIO";
    if (drawStack > 0) turnTxt = `⚠️ ATTENZIONE: +${drawStack}!`;
    document.getElementById("turnIndicator").innerText = turnTxt;

    const unoBtn = document.getElementById("masterUnoBtn");
    const canPlay = playerHand.some(c => isValidMove(c));
    if(playerHand.length === 2 && isMyTurn && canPlay) unoBtn.classList.remove("hidden");
    else unoBtn.classList.add("hidden");

    const pHand = document.getElementById("playerHand"); pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        const v = card.value === "draw2" ? "+2" : (card.value === "wild4" ? "+4" : (card.value === "skip" ? "Ø" : (card.value === "reverse" ? "⇄" : card.value)));
        div.className = `card ${card.color}`;
        div.innerText = v; div.setAttribute('data-val', v);
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    const oHand = document.getElementById("opponentHand"); oHand.innerHTML = "";
    opponentHand.forEach(() => { oHand.innerHTML += `<div class="card-back-classic" style="margin: 0 -22px;">MASTER<br>UNO</div>`; });

    const discard = document.getElementById("discardPile");
    const topV = topCard.value === "draw2" ? "+2" : (topCard.value === "wild4" ? "+4" : (topCard.value === "skip" ? "Ø" : topCard.value));
    discard.innerHTML = `<div class="card ${currentColor}" data-val="${topV}" style="margin:0;">${topV}</div>`;
}

function isValidMove(card) {
    if (drawStack > 0) return card.value === "draw2" || card.value === "wild4";
    return card.color === currentColor || card.value === topCard.value || card.color.includes("wild");
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    if (isValidMove(card)) {
        if(playerHand.length === 2 && !hasSaidUno) {
            showAutoAlert("PENALITÀ! +2 CARTE");
            playerHand.push(deck.pop(), deck.pop());
            isMyTurn = false; renderGame(); setTimeout(botTurn, 1000); return;
        }
        playerHand.splice(i, 1);
        topCard = card;
        hasSaidUno = false;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        if (card.color.includes("wild")) document.getElementById("colorPicker").classList.remove("hidden");
        else { currentColor = card.color; endTurn(); }
        renderGame();
    }
}

function endTurn() {
    isMyTurn = !isMyTurn;
    if ((topCard.value === "skip" || topCard.value === "reverse") && drawStack === 0) isMyTurn = !isMyTurn;
    renderGame();
    if (!isMyTurn) setTimeout(botTurn, 1200);
}

function botTurn() {
    if (isMyTurn) return;
    let idx = opponentHand.findIndex(c => isValidMove(c));
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        endTurn();
    } else {
        if (drawStack > 0) { for(let i=0; i<drawStack; i++) opponentHand.push(deck.pop()); drawStack = 0; }
        else opponentHand.push(deck.pop());
        isMyTurn = true; renderGame();
    }
}

document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    if (drawStack > 0) { for(let i=0; i<drawStack; i++) playerHand.push(deck.pop()); drawStack = 0; }
    else playerHand.push(deck.pop());
    isMyTurn = false; renderGame(); setTimeout(botTurn, 1000);
};

window.setWildColor = (c) => { currentColor = c; document.getElementById("colorPicker").classList.add("hidden"); endTurn(); };
document.getElementById("masterUnoBtn").onclick = () => { hasSaidUno = true; showAutoAlert("MASTERUNO! 🔥"); };
document.getElementById("playBotBtn").onclick = () => startG(true);
document.getElementById("copyBtn").onclick = () => { navigator.clipboard.writeText(document.getElementById("myPeerId").innerText); showAutoAlert("ID COPIATO!"); };
function startG(me) { document.getElementById("startScreen").classList.add("hidden"); document.getElementById("gameArea").classList.remove("hidden"); createDeck(); playerHand=[]; opponentHand=[]; for(let i=0; i<7; i++){playerHand.push(deck.pop()); opponentHand.push(deck.pop());} topCard=deck.pop(); while(topCard.color.includes("wild")) topCard=deck.pop(); currentColor=topCard.color; isMyTurn=me; renderGame(); }
