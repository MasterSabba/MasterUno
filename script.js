const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, drawStack = 0, peer, conn;

// Inizializzazione PeerJS
const initPeer = () => {
    const id = Math.random().toString(36).substr(2, 5).toUpperCase();
    peer = new Peer(id);
    peer.on('open', res => {
        const idElem = document.getElementById("myPeerId");
        if(idElem) idElem.innerText = res;
    });
    peer.on('connection', c => {
        conn = c;
        conn.on('open', () => startG(false));
    });
};
initPeer();

// Funzione Creazione Mazzo
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

// Icone e Valori
function getDisplayVal(v) {
    if (v === "draw2") return "+2";
    if (v === "wild4") return "+4";
    if (v === "skip") return "Ø";
    if (v === "reverse") return "⇄";
    return v;
}

// Controllo validità mossa (Fix Stacking +4)
function isValidMove(card) {
    if (drawStack > 0) {
        // Se c'è una "bomba", puoi rispondere solo con un altro +2 o +4
        return card.value === "draw2" || card.value === "wild4";
    }
    return card.color === currentColor || card.value === topCard.value || card.color.includes("wild");
}

function renderGame() {
    if (playerHand.length === 0) { showEndScreen(true); return; }
    if (opponentHand.length === 0) { showEndScreen(false); return; }

    document.getElementById("playerBadge").innerText = `TU: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `BOT: ${opponentHand.length}`;
    
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO AVVERSARIO";

    // Mostra/Nascondi MasterUno
    const unoBtn = document.getElementById("masterUnoBtn");
    if(playerHand.length === 2 && isMyTurn) unoBtn.classList.remove("hidden");
    else unoBtn.classList.add("hidden");

    // Mano Giocatore
    const pHand = document.getElementById("playerHand");
    pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        const v = getDisplayVal(card.value);
        div.className = `card ${card.color}`;
        div.innerText = v;
        div.setAttribute('data-val', v);
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    // Mano Bot
    const oHand = document.getElementById("opponentHand");
    oHand.innerHTML = "";
    opponentHand.forEach(() => {
        oHand.innerHTML += `<div class="card-back-classic" style="margin: 0 -22px;">MASTER<br>UNO</div>`;
    });

    // Scarto
    const discard = document.getElementById("discardPile");
    const topV = getDisplayVal(topCard.value);
    discard.innerHTML = `<div class="card ${currentColor}" data-val="${topV}" style="margin:0;">${topV}</div>`;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];

    if (isValidMove(card)) {
        if(playerHand.length === 2 && !hasSaidUno) {
            alert("NON HAI DETTO MASTERUNO! +2");
            playerHand.push(deck.pop(), deck.pop());
            isMyTurn = false; 
            renderGame(); 
            setTimeout(botTurn, 1000); 
            return;
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
            endTurn();
        }
        renderGame();
    }
}

function endTurn() {
    isMyTurn = !isMyTurn;
    // Se è skip o reverse, salta il turno dell'avversario (se non ci sono stack)
    if ((topCard.value === "skip" || topCard.value === "reverse") && drawStack === 0) {
        isMyTurn = !isMyTurn;
    }
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
        if (drawStack > 0) {
            for(let i=0; i<drawStack; i++) opponentHand.push(deck.pop());
            drawStack = 0;
        } else {
            opponentHand.push(deck.pop());
        }
        isMyTurn = true;
        renderGame();
    }
}

// Funzione Pesca
document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    if (drawStack > 0) {
        for(let i=0; i<drawStack; i++) playerHand.push(deck.pop());
        drawStack = 0;
    } else {
        playerHand.push(deck.pop());
    }
    isMyTurn = false;
    renderGame();
    setTimeout(botTurn, 1000);
};

// Funzione Cambio Colore
window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    endTurn();
};

function showEndScreen(win) {
    const screen = document.createElement("div");
    screen.id = "endScreen";
    screen.innerHTML = `<h1 class="end-title">${win ? "HAI VINTO!" : "HAI PERSO!"}</h1>`;
    document.body.appendChild(screen);

    if (win) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    setTimeout(() => location.reload(), 4000);
}

// Avvio Gioco
function startG(me) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    createDeck();
    playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++){
        playerHand.push(deck.pop());
        opponentHand.push(deck.pop());
    }
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;
    isMyTurn = me;
    renderGame();
}

// Pulsanti Interfaccia
document.getElementById("playBotBtn").onclick = () => startG(true);
document.getElementById("masterUnoBtn").onclick = () => { hasSaidUno = true; alert("MASTERUNO! 🔥"); };
document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(document.getElementById("myPeerId").innerText);
    alert("ID COPIATO!");
};
