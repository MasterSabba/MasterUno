const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, drawStack = 0, peer, conn, isMultiplayer = false, gameActive = true;

// --- INIZIALIZZAZIONE ---
function createDeck() {
    deck = [];
    colors.forEach(c => { values.forEach(v => { deck.push({color: c, value: v}); if(v !== "0") deck.push({color: c, value: v}); }); });
    for(let i=0; i<4; i++){ deck.push({color: "wild", value: "W"}, {color: "wild4", value: "wild4"}); }
    deck.sort(() => Math.random() - 0.5);
}

function showToast(m) {
    let container = document.getElementById('toast-container');
    if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = m;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2500);
}

// --- LOGICA DI GIOCO ---
function isValidMove(card) {
    if (drawStack > 0) {
        if (topCard.value === "draw2") return card.value === "draw2";
        if (topCard.value === "wild4") return card.value === "wild4";
        return false;
    }
    return card.color === currentColor || card.value === topCard.value || card.color.includes("wild");
}

function playCard(i) {
    if (!isMyTurn || !gameActive) return;
    const card = playerHand[i];
    if (isValidMove(card)) {
        if(playerHand.length === 2 && !hasSaidUno) {
            showToast("NON HAI DETTO MASTERUNO! +2 🃏");
            for(let j=0; j<2; j++) if(deck.length > 0) playerHand.push(deck.pop());
            isMyTurn = false; finishAction(); return;
        }
        playerHand.splice(i, 1);
        topCard = card;
        hasSaidUno = false;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        
        if (card.color.includes("wild")) {
            renderGame();
            document.getElementById("colorPicker").classList.remove("hidden");
        } else { 
            currentColor = card.color; 
            finishAction(); 
        }
    }
}

window.setWildColor = (c) => { 
    currentColor = c; 
    document.getElementById("colorPicker").classList.add("hidden"); 
    showToast("COLORE SCELTO: " + c.toUpperCase());
    finishAction(); 
};

function finishAction() {
    renderGame();
    if (playerHand.length === 0) { 
        gameActive = false;
        if(isMultiplayer && conn && conn.open) conn.send({ type: 'GAME_OVER_LOSS' });
        setTimeout(() => showEndScreen(true), 500);
        return; 
    }
    let skip = (topCard.value === "skip" || topCard.value === "reverse") && drawStack === 0;
    if (!skip) isMyTurn = !isMyTurn;
    if (isMultiplayer && conn) sendMove();
    else if (!isMyTurn) setTimeout(botTurn, 1200);
    renderGame();
}

function botTurn() {
    if (!gameActive || isMyTurn) return;
    let idx = opponentHand.findIndex(c => isValidMove(c));
    if (idx !== -1) {
        if (opponentHand.length === 2) showToast("IL BOT DICE: MASTERUNO! 🔥");
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        if (opponentHand.length === 0) {
            renderGame();
            gameActive = false;
            setTimeout(() => showEndScreen(false), 500);
            return;
        }
        finishAction();
    } else {
        if (drawStack > 0) { 
            for(let i=0; i<drawStack; i++) if(deck.length > 0) opponentHand.push(deck.pop()); 
            drawStack = 0; 
            showToast("IL BOT PESCA E PASSA");
        } else { if(deck.length > 0) opponentHand.push(deck.pop()); }
        isMyTurn = true; renderGame();
    }
}

// --- RENDERING ---
function renderGame() {
    document.getElementById("playerBadge").innerText = `TU: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVVERSARIO: ${opponentHand.length}`;
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO AVVERSARIO";
    
    const pHand = document.getElementById("playerHand"); pHand.innerHTML = "";
    playerHand.forEach((c, i) => {
        const d = document.createElement("div"); 
        const v = (c.value === "draw2" ? "+2" : c.value === "wild4" ? "+4" : c.value === "skip" ? "Ø" : c.value === "reverse" ? "⇄" : c.value);
        d.className = `card ${c.color}`; d.innerText = v; d.setAttribute('data-val', v); d.onclick = () => playCard(i); pHand.appendChild(d);
    });
    
    const oHand = document.getElementById("opponentHand"); oHand.innerHTML = "";
    opponentHand.forEach(() => { 
        oHand.innerHTML += `<div class="card-back-classic" style="margin:0 -22px"><span>MASTER</span><span>UNO</span></div>`; 
    });

    const discard = document.getElementById("discardPile");
    const vTop = (topCard.value === "draw2" ? "+2" : topCard.value === "wild4" ? "+4" : topCard.value === "skip" ? "Ø" : topCard.value === "reverse" ? "⇄" : topCard.value);
    discard.innerHTML = `<div class="card ${currentColor}" data-val="${vTop}">${vTop}</div>`;
    
    // FIX: TASTO MASTER UNO SOLO SE HAI CARTE GIOCABILI
    const hasPlayableCard = playerHand.some(card => isValidMove(card));
    const btnUno = document.getElementById("masterUnoBtn");
    if (playerHand.length === 2 && isMyTurn && gameActive && hasPlayableCard) {
        btnUno.classList.remove("hidden");
    } else {
        btnUno.classList.add("hidden");
    }
}

// --- AZIONI MAZZO ---
document.getElementById("deck").onclick = () => {
    if (!isMyTurn || !gameActive) return;
    if (drawStack > 0) { 
        showToast("PESCHI " + drawStack + " CARTE 🃏");
        for(let i=0; i<drawStack; i++) if(deck.length > 0) playerHand.push(deck.pop()); 
        drawStack = 0; 
    } else { if(deck.length > 0) playerHand.push(deck.pop()); }
    isMyTurn = false; 
    if (isMultiplayer) sendMove(); else setTimeout(botTurn, 1000);
    renderGame();
};

// --- MULTIPLAYER (PEERJS) ---
const initPeer = () => {
    peer = new Peer(Math.random().toString(36).substr(2, 5).toUpperCase());
    peer.on('open', id => { document.getElementById("myPeerId").innerText = id; });
    peer.on('connection', c => { conn = c; isMultiplayer = true; setupChat(); });
};
initPeer();

function setupChat() {
    conn.on('data', d => {
        if (d.type === 'START') {
            gameActive = true; deck = d.deck; playerHand = d.oppHand; opponentHand = d.plHand;
            topCard = d.top; currentColor = d.color; isMyTurn = d.turn; drawStack = 0;
            document.querySelectorAll("#startScreen, #endScreen, #colorPicker").forEach(s => s.classList.add("hidden"));
            document.getElementById("gameArea").classList.remove("hidden"); renderGame();
        } else if (d.type === 'MOVE') {
            if (d.plHand.length === 1) showToast("L'AVVERSARIO DICE: MASTERUNO! 🔥");
            playerHand = d.oppHand; opponentHand = d.plHand; topCard = d.top;
            currentColor = d.color; drawStack = d.stack; deck = d.deck; isMyTurn = d.turn; renderGame();
            if(opponentHand.length === 0) { gameActive = false; showEndScreen(false); }
        } else if (d.type === 'GAME_OVER_LOSS') {
            gameActive = false;
            showEndScreen(false); 
        }
    });
}

function startG(me) {
    gameActive = true; createDeck(); playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++){ playerHand.push(deck.pop()); opponentHand.push(deck.pop()); }
    topCard = deck.pop(); while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color; isMyTurn = me; drawStack = 0;
    if (isMultiplayer && conn) conn.send({ type: 'START', deck, plHand: playerHand, oppHand: opponentHand, top: topCard, color: currentColor, turn: !me });
    document.querySelectorAll("#startScreen, #endScreen").forEach(s => s.classList.add("hidden"));
    document.getElementById("gameArea").classList.remove("hidden"); renderGame();
}

function sendMove() { if (conn && conn.open) conn.send({ type: 'MOVE', plHand: playerHand, oppHand: opponentHand, top: topCard, color: currentColor, stack: drawStack, deck: deck, turn: !isMyTurn }); }

// --- BOTTONI UI ---
document.getElementById("copyBtn").onclick = () => { 
    navigator.clipboard.writeText(document.getElementById("myPeerId").innerText); 
    showToast("ID COPIATO! 📋");
};
document.getElementById("playBotBtn").onclick = () => { isMultiplayer = false; startG(true); };
document.getElementById("connectBtn").onclick = () => { 
    let id = document.getElementById("friendIdInput").value.trim().toUpperCase(); 
    if (id) { conn = peer.connect(id); isMultiplayer = true; setupChat(); conn.on('open', () => startG(true)); } 
};
document.getElementById("masterUnoBtn").onclick = () => { hasSaidUno = true; showToast("MASTERUNO! 🔥"); };
document.getElementById("playAgainBtn").onclick = () => startG(true);
document.getElementById("exitBtn").onclick = () => location.reload();

function showEndScreen(win) { 
    gameActive = false;
    const screen = document.getElementById("endScreen");
    const title = document.getElementById("endTitle");
    screen.classList.remove("hidden");
    title.innerText = win ? "HAI VINTO!" : "HAI PERSO!";
    title.className = "end-title " + (win ? "win-text" : "lose-text");
    if (win) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 6000 });
}
