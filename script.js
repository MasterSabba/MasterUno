const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "", isMyTurn = true;
let stackCount = 0, saidMasterUno = false, peer, conn;

function getCardImg(c, v) {
    if (c === "wild") return "https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/wild.png";
    if (c === "wild4") return "https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/wild_draw4.png";
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

    masterBtn.classList.toggle("hidden", !(playerHand.length === 1 && !saidMasterUno));
    
    turnInd.innerText = isMyTurn ? "🟢 TOCCA A TE" : "🔴 TURNO AVVERSARIO";
    turnInd.style.color = isMyTurn ? "#2ecc71" : "#e74c3c";

    pHand.innerHTML = `<div class="badge">TU: ${playerHand.length}</div>`;
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color} clickable`;
        div.style.backgroundImage = `url('${getCardImg(card.color, card.value)}')`;
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
    disc.innerHTML = `<div class="card ${topCard.color}" style="background-image: url('${getCardImg(topCard.color, topCard.value)}'); box-shadow: 0 0 40px ${glow}"><span>${topCard.value.toUpperCase()}</span></div>`;
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
            // Skip e Reverse ridanno il turno in 1vs1
            let playAgain = (card.value === "skip" || card.value === "reverse" || stackCount > 0);
            endTurn(!playAgain);
        }
    }
}

function setWildColor(c) {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    // Se è un +4, l'altro deve pescare o rispondere, quindi NON gli saltiamo il turno nel senso classico
    endTurn(false);
}

function endTurn(passTurn) {
    if (playerHand.length === 0) {
        if (!saidMasterUno) {
            alert("NON HAI DETTO MASTERUNO! +2 CARTE");
            drawCard(playerHand, 2);
            isMyTurn = false;
        } else { showEndScreen("player"); return; }
    } else {
        isMyTurn = !passTurn;
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
        if (card.value === "draw2") stackCount += 2;
        else if (card.value === "+4") stackCount += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        
        if (opponentHand.length === 0) { showEndScreen("bot"); return; }
        
        let botAgain = (card.value === "skip" || card.value === "reverse" || stackCount > 0);
        if (botAgain) setTimeout(botTurn, 1000); else isMyTurn = true;
    } else {
        if (stackCount > 0) { drawCard(opponentHand, stackCount); stackCount = 0; }
        else drawCard(opponentHand);
        isMyTurn = true;
    }
    renderGame();
}

document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    drawCard(playerHand, stackCount > 0 ? stackCount : 1);
    stackCount = 0; saidMasterUno = false; isMyTurn = false;
    if (conn) conn.send({ type: "SYNC", topCard, currentColor, stackCount, oppHandSize: playerHand.length, isNextTurn: true });
    renderGame();
    if (!conn) setTimeout(botTurn, 1000);
};

document.getElementById("masterUnoBtn").onclick = () => { saidMasterUno = true; alert("MASTERUNO!"); renderGame(); };

function showEndScreen(winner) {
    document.getElementById("endScreen").classList.remove("hidden");
    document.getElementById("endMessage").innerText = winner === "player" ? "🏆 HAI VINTO!" : "💀 HAI PERSO!";
    document.getElementById("endMessage").style.color = winner === "player" ? "#f1c40f" : "#e74c3c";
    if(winner === "player") confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

// Inizializzazione Multiplayer (PeerJS)
peer = new Peer();
peer.on('open', id => document.getElementById("myPeerId").innerText = id);
peer.on('connection', c => { conn = c; conn.on('data', handleSync); startG(false); });
document.getElementById("connectBtn").onclick = () => {
    conn = peer.connect(document.getElementById("friendIdInput").value);
    conn.on('open', () => { conn.on('data', handleSync); startG(true); });
};
function handleSync(data) {
    if (data.type === "SYNC") {
        topCard = data.topCard; currentColor = data.currentColor; stackCount = data.stackCount;
        isMyTurn = data.isNextTurn; opponentHand = new Array(data.oppHandSize).fill({});
        if (data.oppHandSize === 0) showEndScreen("bot");
        renderGame();
    }
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
