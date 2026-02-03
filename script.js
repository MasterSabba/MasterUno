const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "", isMyTurn = true;
let stackCount = 0; 
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
    const infoCol = document.getElementById("colorDisplay");

    pHand.innerHTML = `<div class="badge">TU: ${playerHand.length}</div>`;
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color} clickable`;
        div.style.backgroundImage = `url('${getCardImg(card.color, card.value)}')`;
        div.innerHTML = `<span>${card.value}</span>`;
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    oHand.innerHTML = `<div class="badge">AVV: ${opponentHand.length}</div>`;
    opponentHand.forEach(() => {
        const div = document.createElement("div");
        div.className = "card-back";
        oHand.appendChild(div);
    });

    const glowColor = (currentColor === "yellow") ? "#f1c40f" : (currentColor === "blue" ? "#0984e3" : currentColor);
    disc.innerHTML = `<div class="card ${topCard.color}" style="background-image: url('${getCardImg(topCard.color, topCard.value)}'); box-shadow: 0 0 40px 15px ${glowColor}"><span>${topCard.value}</span></div>`;
    
    let statusText = currentColor.toUpperCase();
    if (stackCount > 0) statusText += ` - ATTENZIONE: +${stackCount} IN ARRIVO!`;
    infoCol.innerText = statusText;
    infoCol.style.color = glowColor;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];

    // Se c'è un accumulo, puoi solo rispondere con la STESSA carta speciale
    const canStack = (stackCount > 0 && card.value === topCard.value);
    const normalPlay = (stackCount === 0 && (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")));

    if (canStack || normalPlay) {
        playerHand.splice(i, 1);
        topCard = card;

        if (card.value === "draw2") stackCount += 2;
        else if (card.value === "+4") stackCount += 4;

        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            // Se tiri una carta che accumula, DEVE toccare all'altro per dargli modo di rispondere o pescare
            let skipOther = (card.value === "skip" || card.value === "reverse");
            endTurn(skipOther); 
        }
    }
}

function setWildColor(c) {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    // Dopo il +4, tocca all'altro (che deve rispondere o pescare)
    endTurn(false);
}

function endTurn(skipNext) {
    if (playerHand.length === 0) { alert("HAI VINTO!"); location.reload(); return; }
    
    // Passiamo il turno: se skipNext è vero, tocca ancora a me. 
    // Se c'è stackCount > 0, forziamo il turno all'avversario.
    if (stackCount > 0) isMyTurn = false; 
    else isMyTurn = skipNext;

    if (conn) {
        conn.send({ 
            type: "SYNC", 
            topCard, currentColor, stackCount, 
            oppHandSize: playerHand.length,
            isNextTurn: !isMyTurn 
        });
    }

    renderGame();
    if (!isMyTurn && !conn) setTimeout(botTurn, 1000);
}

function botTurn() {
    if (isMyTurn) return;

    // Il bot cerca di rispondere allo stacking o gioca normale
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
        
        if (opponentHand.length === 0) { alert("IL BOT HA VINTO!"); location.reload(); return; }
        
        // Se il bot tira skip/reverse tocca ancora a lui, altrimenti tocca a te
        let botPlayAgain = (card.value === "skip" || card.value === "reverse");
        if (botPlayAgain && stackCount === 0) {
            renderGame();
            setTimeout(botTurn, 1000);
        } else {
            isMyTurn = true;
            renderGame();
        }
    } else {
        // Il Bot non ha carte: subisce l'accumulo
        if (stackCount > 0) {
            drawCard(opponentHand, stackCount);
            stackCount = 0;
        } else {
            drawCard(opponentHand);
        }
        isMyTurn = true;
        renderGame();
    }
}

document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    
    if (stackCount > 0) {
        // PESCHI TU e il turno finisce
        drawCard(playerHand, stackCount);
        stackCount = 0;
    } else {
        drawCard(playerHand);
    }
    
    isMyTurn = false;
    if (conn) conn.send({ type: "SYNC", topCard, currentColor, stackCount, oppHandSize: playerHand.length, isNextTurn: true });
    
    renderGame();
    if (!conn) setTimeout(botTurn, 1000);
};

// MULTIPLAYER
peer = new Peer();
peer.on('open', id => { document.getElementById("myPeerId").innerText = id; });
peer.on('connection', c => { conn = c; conn.on('data', handleSync); startG(false); });
document.getElementById("connectBtn").onclick = () => {
    conn = peer.connect(document.getElementById("friendIdInput").value);
    conn.on('open', () => { conn.on('data', handleSync); startG(true); });
};
function handleSync(data) {
    if (data.type === "SYNC") {
        topCard = data.topCard;
        currentColor = data.currentColor;
        stackCount = data.stackCount;
        isMyTurn = data.isNextTurn;
        opponentHand = new Array(data.oppHandSize).fill({}); 
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
