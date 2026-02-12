const colors = ["red", "blue", "green", "yellow"];
const values = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
let deck = [], hands = [], topCard = null, currentColor = "", drawStack = 0;
let turn = 0, direction = 1, gameActive = false, hasSaidUno = false;
let numPlayers = 2, swapRule = "0";

function createDeck() {
    deck = [];
    colors.forEach(c => {
        values.forEach(v => {
            deck.push({color: c, value: v});
            if(v !== "0") deck.push({color: c, value: v});
        });
    });
    for(let i=0;i<4;i++){ 
        deck.push({color:"wild", value:"W"}); 
        deck.push({color:"wild4", value:"wild4"}); 
    }
    deck.sort(() => Math.random()-0.5);
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className='toast'; t.innerText = msg;
    container.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),500); }, 2500);
}

function isValidMove(card){
    if(drawStack > 0){
        if(topCard.value === "draw2") return card.value === "draw2" || card.value === "wild4";
        if(topCard.value === "wild4") return card.value === "wild4";
        return false;
    }
    return card.color === currentColor || card.value === topCard.value || card.color.includes("wild");
}

function playCard(pIdx, cIdx){
    if(turn !== pIdx || !gameActive) return;
    const hand = hands[pIdx];
    const card = hand[cIdx];

    if(isValidMove(card)){
        if(pIdx === 0 && hand.length === 2 && !hasSaidUno){
            showToast("NON HAI DETTO MASTERUNO! +2 🃏");
            drawFromDeck(0, 2);
            nextTurn();
            return;
        }

        hand.splice(cIdx,1);
        topCard = card;
        hasSaidUno = false;

        if(card.value === "draw2") drawStack += 2;
        if(card.value === "wild4") drawStack += 4;
        if(card.value === "reverse") direction *= -1;
        if(card.value === "skip") turn = (turn + direction + numPlayers) % numPlayers;

        // Regola 0: Scambio automatico mani
        if(card.value === "0" && (swapRule === "0" || swapRule === "both")) {
            showToast("REGOLA 0: TUTTI SCAMBIANO! 🔄");
            let tempHands = hands.map(h => [...h]);
            for(let i=0; i<numPlayers; i++) {
                let target = (i + direction + numPlayers) % numPlayers;
                hands[target] = tempHands[i];
            }
        }

        // Regola 7: Scambio a scelta (Il bot sceglie a caso, tu il prossimo)
        if(card.value === "7" && (swapRule === "7" || swapRule === "both")) {
            showToast("REGOLA 7: SCAMBIO MANO! 🤝");
            let target = (pIdx + 1) % numPlayers;
            let temp = hands[pIdx];
            hands[pIdx] = hands[target];
            hands[target] = temp;
        }

        if(card.color.includes("wild")){
            if(pIdx === 0) {
                renderGame();
                document.getElementById("colorPicker").classList.remove("hidden");
            } else {
                currentColor = colors[Math.floor(Math.random()*4)];
                nextTurn();
            }
        } else {
            currentColor = card.color;
            nextTurn();
        }
    }
}

window.setWildColor = (c)=>{
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    showToast("COLORE: " + c.toUpperCase());
    nextTurn();
};

function nextTurn(){
    renderGame();
    if(hands[turn].length === 0){
        gameActive = false;
        showEndScreen(turn === 0);
        return;
    }
    turn = (turn + direction + numPlayers) % numPlayers;
    if(turn !== 0) setTimeout(() => botTurn(), 1200);
}

function botTurn(){
    if(!gameActive) return;
    const hand = hands[turn];
    let idx = hand.findIndex(c => isValidMove(c));
    
    if(idx !== -1){
        if(hand.length === 2) showToast("BOT " + turn + " dice MASTERUNO!");
        playCard(turn, idx);
    } else {
        if(drawStack > 0){
            drawFromDeck(turn, drawStack);
            drawStack = 0;
            showToast("BOT " + turn + " PESCA E PASSA");
        } else {
            drawFromDeck(turn, 1);
        }
        nextTurn();
    }
}

function drawFromDeck(pIdx, qty) {
    for(let i=0; i<qty; i++) {
        if(deck.length === 0) createDeck();
        hands[pIdx].push(deck.pop());
    }
}

function renderGame(){
    // Gestione Avversari
    const oppArea = document.getElementById("opponentsArea");
    oppArea.innerHTML = "";
    for(let i=1; i<numPlayers; i++) {
        const div = document.createElement("div");
        div.className = `opponent-container ${turn === i ? 'active' : ''}`;
        div.innerHTML = `<span>BOT ${i}</span><div class="card-back-classic">${hands[i].length}</div>`;
        oppArea.appendChild(div);
    }

    // Gestione Giocatore
    const playerHand = document.getElementById("playerHand");
    playerHand.innerHTML = "";
    hands[0].forEach((c, idx) => {
        const d = document.createElement("div");
        const v = formatVal(c.value);
        d.className = `card ${c.color}`;
        d.innerText = v;
        d.setAttribute("data-val", v);
        d.onclick = () => playCard(0, idx);
        playerHand.appendChild(d);
    });

    document.getElementById("playerBadge").innerText = "TU: " + hands[0].length;
    document.getElementById("turnIndicator").innerText = turn === 0 ? "🟢 IL TUO TURNO" : `🔴 TURNO DI BOT ${turn}`;

    // Centro
    const discard = document.getElementById("discardPile");
    const vTop = topCard ? formatVal(topCard.value) : "";
    discard.innerHTML = topCard ? `<div class="card ${currentColor}" data-val="${vTop}">${vTop}</div>` : "";

    // Bottone MasterUno
    const btnUno = document.getElementById("masterUnoBtn");
    if(hands[0].length === 2 && turn === 0) btnUno.classList.remove("hidden");
    else btnUno.classList.add("hidden");
}

function formatVal(v) {
    if(v === "draw2") return "+2";
    if(v === "wild4") return "+4";
    if(v === "skip") return "Ø";
    if(v === "reverse") return "⇄";
    if(v === "W") return "🎨";
    return v;
}

document.getElementById("deck").onclick = () => {
    if(turn !== 0 || !gameActive) return;
    if(drawStack > 0){
        drawFromDeck(0, drawStack);
        drawStack = 0;
    } else {
        drawFromDeck(0, 1);
    }
    nextTurn();
};

function startGame(){
    numPlayers = parseInt(document.getElementById("numPlayers").value);
    swapRule = document.getElementById("swapRule").value;
    gameActive = true; 
    createDeck();
    hands = [];
    for(let i=0; i<numPlayers; i++) {
        hands.push([]);
        drawFromDeck(i, 7);
    }
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;
    turn = 0; direction = 1; drawStack = 0;
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    renderGame();
}

document.getElementById("playBotBtn").onclick = startGame;
document.getElementById("masterUnoBtn").onclick = () => {
    hasSaidUno = true;
    showToast("MASTERUNO! 🔥");
};
document.getElementById("playAgainBtn").onclick = () => location.reload();
document.getElementById("exitBtn").onclick = () => location.reload();
