const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, drawStack = 0, peer, conn, isMultiplayer = false;
let gameActive = true; 

// Creazione del mazzo
function createDeck() {
    deck = [];
    colors.forEach(c => { 
        values.forEach(v => { 
            deck.push({color: c, value: v}); 
            if(v !== "0") deck.push({color: c, value: v}); 
        }); 
    });
    for(let i=0; i<4; i++){ 
        deck.push({color: "wild", value: "W"}); 
        deck.push({color: "wild4", value: "wild4"}); 
    }
    deck.sort(() => Math.random() - 0.5);
}

// Verifica validità mossa
function isValidMove(card) {
    if (drawStack > 0) {
        if (topCard.value === "draw2") return card.value === "draw2";
        if (topCard.value === "wild4") return card.value === "wild4";
    }
    return card.color === currentColor || card.value === topCard.value || card.color.includes("wild");
}

// Controllo Vittoria
function checkVictory() {
    if (playerHand.length === 0) { 
        gameActive = false; 
        if(isMultiplayer) conn.send({type:'END'}); 
        showEndScreen(true); 
        return true; 
    }
    if (opponentHand.length === 0) { 
        gameActive = false; 
        showEndScreen(false); 
        return true; 
    }
    return false;
}

// Schermata Finale con Coriandoli Sincronizzati
function showEndScreen(win) {
    setTimeout(() => {
        const s = document.getElementById("endScreen");
        const t = document.getElementById("endTitle");
        
        // Appaiono scritta e menu
        s.classList.remove("hidden");
        t.innerText = win ? "HAI VINTO!" : "HAI PERSO!";
        t.className = "end-title " + (win ? "win-text" : "lose-text");

        // Partono i coriandoli ESATTAMENTE ora se hai vinto
        if (win) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 6000 });
            let end = Date.now() + 4000;
            (function frame() {
                if (gameActive) return; // Ferma l'animazione se si riavvia il gioco
                confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 6000, colors:['#f1c40f','#ffffff'] });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 6000, colors:['#f1c40f','#ffffff'] });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    }, 2000); // Delay di 2 secondi per vedere l'ultima mossa
}

// Giocata del Giocatore
function playCard(i) {
    if (!isMyTurn || !gameActive) return;
    const card = playerHand[i];
    if (isValidMove(card)) {
        if(playerHand.length === 2 && !hasSaidUno) {
            showToast("NON HAI DETTO MASTERUNO! +2 🃏");
            playerHand.push(deck.pop(), deck.pop());
            finishAction(); return;
        }
        playerHand.splice(i, 1);
        topCard = card;
        hasSaidUno = false;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        if (card.color.includes("wild")) document.getElementById("colorPicker").classList.remove("hidden");
        else { currentColor = card.color; finishAction(); }
        renderGame();
    }
}

// Turno del BOT
function botTurn() {
    if (!gameActive) return;
    let idx = opponentHand.findIndex(c => isValidMove(c));
    if (idx !== -1) {
        // IL BOT DICE MASTERUNO SOLO SE GLI RESTA 1 CARTA DOPO QUESTA MOSSA
        if (opponentHand.length === 2) {
            showToast("IL BOT DICE: MASTERUNO! 🔥");
        }
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        finishAction();
    } else {
        if (drawStack > 0) { for(let i=0; i<drawStack; i++) opponentHand.push(deck.pop()); drawStack = 0; }
        else opponentHand.push(deck.pop());
        isMyTurn = true; renderGame();
    }
}

// Fine azione e cambio turno
function finishAction() {
    renderGame();
    if (checkVictory()) return;
    isMyTurn = !isMyTurn;
    if ((topCard.value === "skip" || topCard.value === "reverse") && drawStack === 0) isMyTurn = !isMyTurn;
    renderGame();
    if (isMultiplayer) sendMove();
    else if (!isMyTurn) setTimeout(botTurn, 1200);
}

// Rendering del tavolo
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
    opponentHand.forEach(() => { oHand.innerHTML += `<div class="card-back-classic" style="margin:0 -22px">MASTER<br>UNO</div>`; });

    const discard = document.getElementById("discardPile");
    const vTop = (topCard.value === "draw2" ? "+2" : topCard.value === "wild4" ? "+4" : topCard.value === "skip" ? "Ø" : topCard.value === "reverse" ? "⇄" : topCard.value);
    discard.innerHTML = `<div class="card ${currentColor}" data-val="${vTop}">${vTop}</div>`;
    
    document.getElementById("masterUnoBtn").className = (playerHand.length === 2 && isMyTurn && gameActive) ? "" : "hidden";
}

// Logica PeerJS
const initPeer = () => {
    peer = new Peer(Math.random().toString(36).substr(2, 5).toUpperCase());
    peer.on('open', id => document.getElementById("myPeerId").innerText = id);
    peer.on('connection', c => { conn = c; isMultiplayer = true; setupChat(); });
};
initPeer();

function setupChat() {
    conn.on('data', d => {
        if (d.type === 'START') {
            gameActive = true; deck = d.deck; playerHand = d.oppHand; opponentHand = d.plHand;
            topCard = d.top; currentColor = d.top.color; isMyTurn = d.turn;
            document.querySelectorAll("#startScreen, #endScreen").forEach(s => s.classList.add("hidden"));
            document.getElementById("gameArea").classList.remove("hidden"); renderGame();
        } else if (d.type === 'MOVE') {
            playerHand = d.oppHand; opponentHand = d.plHand; topCard = d.top;
            currentColor = d.color; drawStack = d.stack; deck = d.deck; isMyTurn = d.turn; renderGame();
            checkVictory();
        } else if (d.type === 'END') { gameActive = false; showEndScreen(false); }
    });
}

function startG(me) {
    gameActive = true; createDeck(); playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++){ playerHand.push(deck.pop()); opponentHand.push(deck.pop()); }
    topCard = deck.pop(); while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color; isMyTurn = me; drawStack = 0;
    if (isMultiplayer && conn) conn.send({ type: 'START', deck, plHand: playerHand, oppHand: opponentHand, top: topCard, turn: !me });
    document.querySelectorAll("#startScreen, #endScreen").forEach(s => s.classList.add("hidden"));
    document.getElementById("gameArea").classList.remove("hidden"); renderGame();
}

function sendMove() { if (conn && conn.open) conn.send({ type: 'MOVE', plHand: playerHand, oppHand: opponentHand, top: topCard, color: currentColor, stack: drawStack, deck: deck, turn: !isMyTurn }); }

// Event Listeners
document.getElementById("playBotBtn").onclick = () => { isMultiplayer = false; startG(true); };
document.getElementById("connectBtn").onclick = () => {
    let id = document.getElementById("friendIdInput").value.trim().toUpperCase();
    if (id) { conn = peer.connect(id); isMultiplayer = true; setupChat(); conn.on('open', () => startG(true)); }
};
document.getElementById("deck").onclick = () => {
    if (!isMyTurn || !gameActive) return;
    if (drawStack > 0) { for(let i=0; i<drawStack; i++) playerHand.push(deck.pop()); drawStack = 0; }
    else playerHand.push(deck.pop());
    isMyTurn = false; if (isMultiplayer) sendMove(); renderGame(); if (!isMultiplayer) setTimeout(botTurn, 1000);
};
window.setWildColor = (c) => { currentColor = c; document.getElementById("colorPicker").classList.add("hidden"); finishAction(); };
document.getElementById("copyBtn").onclick = () => { navigator.clipboard.writeText(document.getElementById("myPeerId").innerText); showToast("ID COPIATO!"); };
document.getElementById("masterUnoBtn").onclick = () => { hasSaidUno = true; showToast("MASTERUNO! 🔥"); };
document.getElementById("playAgainBtn").onclick = () => startG(true);
document.getElementById("exitBtn").onclick = () => location.reload();

function showToast(m) {
    let c = document.getElementById('toast-container') || document.createElement('div');
    c.id = 'toast-container'; document.body.appendChild(c);
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = m;
    c.appendChild(t); setTimeout(() => t.remove(), 2000);
}
