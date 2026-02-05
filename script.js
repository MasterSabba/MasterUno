const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, drawStack = 0, peer, conn, isMultiplayer = false;
let gameActive = true;

function createDeck() {
    deck = [];
    colors.forEach(c => { values.forEach(v => { deck.push({color: c, value: v}); if(v!=="0") deck.push({color: c, value: v}); }); });
    for(let i=0; i<4; i++){ deck.push({color: "wild", value: "W"}, {color: "wild4", value: "wild4"}); }
    deck.sort(() => Math.random() - 0.5);
}

// Mostra schermata fine partita con coriandoli sincronizzati
function showEndScreen(win) {
    gameActive = false; // Ferma ogni azione
    setTimeout(() => {
        const s = document.getElementById("endScreen");
        const t = document.getElementById("endTitle");
        
        s.classList.remove("hidden");
        t.innerText = win ? "HAI VINTO!" : "HAI PERSO!";
        t.className = "end-title " + (win ? "win-text" : "lose-text");

        if (win) {
            // I coriandoli esplodono esattamente all'apparire della scritta
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 6000 });
        }
    }, 2000); // Pausa di 2 secondi dopo l'ultima carta giocata
}

function botTurn() {
    if (!gameActive) return;
    let idx = opponentHand.findIndex(c => (drawStack > 0 ? (c.value === topCard.value) : (c.color === currentColor || c.value === topCard.value || c.color.includes("wild"))));
    
    if (idx !== -1) {
        // IL BOT DICE MASTERUNO se sta scartando e gli rimarrà una sola carta
        if (opponentHand.length === 2) {
            showToast("IL BOT DICE: MASTERUNO! 🔥");
        }
        
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        
        if (opponentHand.length === 0) { 
            showEndScreen(false); 
        } else { 
            isMyTurn = true; 
            if(card.value === "skip" || card.value === "reverse") { isMyTurn = false; setTimeout(botTurn, 1200); }
        }
    } else {
        if (drawStack > 0) { for(let i=0; i<drawStack; i++) opponentHand.push(deck.pop()); drawStack = 0; }
        else opponentHand.push(deck.pop());
        isMyTurn = true;
    }
    renderGame();
}

function playCard(i) {
    if (!isMyTurn || !gameActive) return;
    const card = playerHand[i];
    let valid = (drawStack > 0) ? (card.value === topCard.value) : (card.color === currentColor || card.value === topCard.value || card.color.includes("wild"));
    
    if (valid) {
        if (playerHand.length === 2 && !hasSaidUno) {
            showToast("NON HAI DETTO MASTERUNO! +2");
            playerHand.push(deck.pop(), deck.pop());
            isMyTurn = false; setTimeout(botTurn, 1200);
        } else {
            playerHand.splice(i, 1);
            topCard = card;
            hasSaidUno = false;
            if (card.value === "draw2") drawStack += 2;
            if (card.value === "wild4") drawStack += 4;
            if (card.color.includes("wild")) document.getElementById("colorPicker").classList.remove("hidden");
            else { 
                currentColor = card.color;
                if (playerHand.length === 0) { showEndScreen(true); }
                else { isMyTurn = false; if(card.value !== "skip" && card.value !== "reverse") setTimeout(botTurn, 1200); else isMyTurn = true; }
            }
        }
        renderGame();
    }
}

function renderGame() {
    document.getElementById("playerBadge").innerText = `TU: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `BOT: ${opponentHand.length}`;
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO DEL BOT";
    
    const pHand = document.getElementById("playerHand"); pHand.innerHTML = "";
    playerHand.forEach((c, i) => {
        const d = document.createElement("div"); d.className = `card ${c.color}`;
        d.innerText = c.value; d.setAttribute('data-val', c.value); d.onclick = () => playCard(i); pHand.appendChild(d);
    });

    const oHand = document.getElementById("opponentHand"); oHand.innerHTML = "";
    opponentHand.forEach(() => { oHand.innerHTML += `<div class="card-back-classic" style="margin:0 -20px">UNO</div>`; });

    const discard = document.getElementById("discardPile");
    discard.innerHTML = `<div class="card ${currentColor}" data-val="${topCard.value}">${topCard.value}</div>`;
    
    document.getElementById("masterUnoBtn").className = (playerHand.length === 2 && isMyTurn) ? "" : "hidden";
}

function startG() {
    gameActive = true; createDeck(); playerHand = []; opponentHand = [];
    for(let i=0; i<7; i++){ playerHand.push(deck.pop()); opponentHand.push(deck.pop()); }
    topCard = deck.pop(); currentColor = topCard.color;
    document.querySelectorAll("#startScreen, #endScreen").forEach(el => el.classList.add("hidden"));
    document.getElementById("gameArea").classList.remove("hidden");
    renderGame();
}

// Controlli UI
document.getElementById("playBotBtn").onclick = startG;
document.getElementById("playAgainBtn").onclick = startG;
document.getElementById("exitBtn").onclick = () => location.reload();
document.getElementById("masterUnoBtn").onclick = () => { hasSaidUno = true; showToast("MASTERUNO! 🔥"); };
document.getElementById("deck").onclick = () => {
    if (!isMyTurn || !gameActive) return;
    if (drawStack > 0) { for(let i=0; i<drawStack; i++) playerHand.push(deck.pop()); drawStack = 0; }
    else playerHand.push(deck.pop());
    isMyTurn = false; renderGame(); setTimeout(botTurn, 1000);
};
function setWildColor(c) { currentColor = c; document.getElementById("colorPicker").classList.add("hidden"); isMyTurn = false; renderGame(); setTimeout(botTurn, 1200); }
function showToast(m) {
    const c = document.getElementById("toast-container"); const t = document.createElement("div");
    t.className = "toast"; t.innerText = m; c.appendChild(t); setTimeout(() => t.remove(), 2000);
}
