/* --- 1. CONFIGURAZIONE E VARIABILI --- */
const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, drawStack = 0;
let peer, conn, isMultiplayer = false;

/* --- 2. LOGICA MAZZO E REGOLE --- */
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

function getDisplayVal(v) {
    if (v === "draw2") return "+2";
    if (v === "wild4") return "+4";
    if (v === "skip") return "Ø";
    if (v === "reverse") return "⇄";
    return v;
}

function isValidMove(card) {
    if (drawStack > 0) {
        if (topCard.value === "draw2") return card.value === "draw2" || card.value === "wild4";
        if (topCard.value === "wild4") return card.value === "wild4";
    }
    return card.color === currentColor || card.value === topCard.value || card.color.includes("wild");
}

/* --- 3. GESTIONE AZIONI E TURNI --- */
function playCard(i) {
    if (!isMyTurn) return;
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
        
        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            finishAction();
        }
        renderGame();
    } else {
        if (drawStack > 0) showToast("DEVI RISPONDERE AL +" + (topCard.value === "wild4" ? "4!" : "2!"));
    }
}

function finishAction() {
    // Controllo vittoria immediata prima di passare il turno
    if (playerHand.length === 0) {
        renderGame();
        if (isMultiplayer) conn.send({ type: 'END' });
        showEndScreen(true);
        return;
    }

    isMyTurn = !isMyTurn;
    // Salto turno
    if ((topCard.value === "skip" || topCard.value === "reverse") && drawStack === 0) {
        isMyTurn = !isMyTurn;
        showToast("TURNO SALTATO! 🚫");
    }
    
    renderGame();
    
    if (isMultiplayer && conn) {
        sendMove();
    } else if (!isMyTurn) {
        setTimeout(botTurn, 1200);
    }
}

function botTurn() {
    if (isMyTurn || isMultiplayer) return;
    let idx = opponentHand.findIndex(c => isValidMove(c));
    if (idx !== -1) {
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        finishAction();
    } else {
        if (drawStack > 0) { 
            for(let i=0; i<drawStack; i++) opponentHand.push(deck.pop()); 
            drawStack = 0; 
            showToast("IL BOT PESCA LE CARTE! 🃏");
        } else {
            opponentHand.push(deck.pop());
        }
        isMyTurn = true; renderGame();
    }
}

/* --- 4. INTERFACCIA E SYNC --- */
function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2000);
}

function renderGame() {
    document.getElementById("playerBadge").innerText = `TU: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVVERSARIO: ${opponentHand.length}`;
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO AVVERSARIO";

    const pHand = document.getElementById("playerHand"); pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        const v = getDisplayVal(card.value);
        div.className = `card ${card.color}`;
        div.innerText = v;
        div.setAttribute('data-val', v);
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    const oHand = document.getElementById("opponentHand"); oHand.innerHTML = "";
    opponentHand.forEach(() => { oHand.innerHTML += `<div class="card-back-classic" style="margin: 0 -22px;">MASTER<br>UNO</div>`; });

    const discard = document.getElementById("discardPile");
    const topV = getDisplayVal(topCard.value);
    discard.innerHTML = `<div class="card ${currentColor}" data-val="${topV}" style="margin:0;">${topV}</div>`;

    const unoBtn = document.getElementById("masterUnoBtn");
    if(playerHand.length === 2 && isMyTurn) unoBtn.classList.remove("hidden");
    else unoBtn.classList.add("hidden");
}

function sendMove() {
    if (conn && conn.open) {
        conn.send({
            type: 'MOVE',
            plHand: playerHand,
            oppHand: opponentHand,
            top: topCard,
            color: currentColor,
            stack: drawStack,
            deck: deck,
            turn: !isMyTurn // Sincronizza il turno dell'altro
        });
    }
}

function showEndScreen(win) {
    const screen = document.createElement("div");
    screen.id = "endScreen";
    screen.innerHTML = `<h1 class="end-title">${win ? "HAI VINTO!" : "HAI PERSO!"}</h1>`;
    document.body.appendChild(screen);
    if (win) confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => location.reload(), 5000);
}

/* --- 5. CONNESSIONE --- */
const initPeer = () => {
    const id = Math.random().toString(36).substr(2, 5).toUpperCase();
    peer = new Peer(id);
    peer.on('open', res => document.getElementById("myPeerId").innerText = res);
    peer.on('connection', c => {
        conn = c; isMultiplayer = true; setupChat();
        showToast("GIOCATORE CONNESSO!");
    });
};
initPeer();

function setupChat() {
    conn.on('data', data => {
        if (data.type === 'START') {
            deck = data.deck;
            playerHand = data.oppHand;
            opponentHand = data.plHand;
            topCard = data.top;
            currentColor = data.top.color;
            isMyTurn = data.turn;
            document.getElementById("startScreen").classList.add("hidden");
            document.getElementById("gameArea").classList.remove("hidden");
            renderGame();
        } else if (data.type === 'MOVE') {
            playerHand = data.oppHand;
            opponentHand = data.plHand;
            topCard = data.top;
            currentColor = data.color;
            drawStack = data.stack;
            deck = data.deck;
            isMyTurn = data.turn;
            renderGame();
        } else if (data.type === 'UNO') {
            showToast("L'AVVERSARIO HA DETTO MASTERUNO! 🔥");
        } else if (data.type === 'END') {
            showEndScreen(false); // Se lui manda END, io ho perso
        }
    });
}

function startG(me) {
    createDeck();
    playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++){ playerHand.push(deck.pop()); opponentHand.push(deck.pop()); }
    topCard = deck.pop(); while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;
    isMyTurn = me;

    if (isMultiplayer && conn) {
        conn.send({ type: 'START', deck: deck, plHand: playerHand, oppHand: opponentHand, top: topCard, turn: !me });
    }
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    renderGame();
}

// PULSANTI
document.getElementById("playBotBtn").onclick = () => { isMultiplayer = false; startG(true); };
document.getElementById("connectBtn").onclick = () => {
    const friendId = document.getElementById("friendIdInput").value.trim().toUpperCase();
    if (friendId) {
        conn = peer.connect(friendId);
        isMultiplayer = true; setupChat();
        conn.on('open', () => { showToast("CONNESSO!"); startG(true); });
    }
};

document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    if (drawStack > 0) { 
        for(let i=0; i<drawStack; i++) playerHand.push(deck.pop()); 
        drawStack = 0; 
        showToast("HAI PESCATO LE CARTE!");
    } else {
        playerHand.push(deck.pop());
    }
    isMyTurn = false;
    if (isMultiplayer) sendMove();
    renderGame();
    if (!isMultiplayer) setTimeout(botTurn, 1000);
};

window.setWildColor = (c) => { 
    currentColor = c; 
    document.getElementById("colorPicker").classList.add("hidden"); 
    finishAction(); 
};

document.getElementById("masterUnoBtn").onclick = () => { 
    hasSaidUno = true; 
    showToast("MASTERUNO! 🔥"); 
    if (isMultiplayer) conn.send({ type: 'UNO' });
};

document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(document.getElementById("myPeerId").innerText);
    showToast("ID COPIATO!");
};
