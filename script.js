let peer, myNick, connections = [], players = [];
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 4 };
let deck = [], playerHand = [], topCard = null, currentColor = "", drawStack = 0;
let isMyTurn = false, currentPlayerIdx = 0, gameActive = false;

// --- EMOJI & TOAST ---
window.sendChat = (e) => showToast(myNick + ": " + e);

function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t); 
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 500); }, 2500);
}

// --- UTILITY SIMBOLI ---
const getSym = (v) => {
    if(v === "skip") return "🚫";
    if(v === "reverse") return "🔄";
    if(v === "draw2") return "+2";
    return v;
};

// --- LOGIN ---
document.getElementById("loginBtn").onclick = () => {
    myNick = document.getElementById("nickInput").value.trim();
    if (!myNick) { showToast("Metti un Nickname!"); return; }
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("welcomeText").innerText = "Ciao, " + myNick;
    initPeer();
};

function initPeer() {
    const id = myNick.toUpperCase() + "-" + Math.floor(Math.random()*999);
    peer = new Peer(id);
    peer.on('open', res => document.getElementById("myPeerId").innerText = res);
    peer.on('connection', conn => {
        connections.push(conn);
        conn.on('data', d => handleData(d));
    });
}

// --- LOGICA GIOCO ---
document.getElementById("startGameBtn").onclick = () => {
    gameActive = true;
    createDeck();
    players = [{ nick: myNick, id: 'ME', hand: [] }];
    for(let i=0; i < (gameSettings.maxPlayers - 1); i++) 
        players.push({ nick: "Bot " + (i + 1), id: 'BOT' + i, isBot: true, hand: draw(7) });
    
    playerHand = draw(7);
    topCard = deck.pop();
    while(topCard.value === "draw2" || topCard.color === "wild") topCard = deck.pop();
    currentColor = topCard.color;
    
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    currentPlayerIdx = 0;
    isMyTurn = true;
    renderGame();
};

function createDeck() {
    deck = [];
    const cols = ["red", "blue", "green", "yellow"];
    const vals = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
    cols.forEach(c => vals.forEach(v => { deck.push({color:c, value:v}); if(v!=="0") deck.push({color:c, value:v}); }));
    for(let i=0; i<4; i++) deck.push({color:"wild", value:"W"});
    deck.sort(() => Math.random() - 0.5);
}

function draw(n) {
    let res = [];
    for(let i=0; i<n; i++) if(deck.length) res.push(deck.pop()); else { createDeck(); res.push(deck.pop()); }
    return res;
}

function renderGame() {
    // Scarto al centro
    const disc = document.getElementById("discardPile");
    disc.innerHTML = `<div class="card ${currentColor}" data-symbol="${getSym(topCard.value)}">${getSym(topCard.value)}</div>`;
    
    // Mazzo al centro
    document.getElementById("deckArea").innerHTML = `<div class="card-back-deck" onclick="drawCard()">MASTER<br>UNO</div>`;

    // Bot in alto
    const oppRow = document.getElementById("otherPlayers");
    oppRow.innerHTML = "";
    players.forEach(p => {
        if(p.id !== 'ME') oppRow.innerHTML += `<div class="opp-badge">${p.nick}<br>🎴 ${p.hand.length}</div>`;
    });

    // Tua Mano
    const handDiv = document.getElementById("playerHand");
    handDiv.innerHTML = "";
    playerHand.forEach((c, i) => {
        const d = document.createElement("div");
        d.className = `card ${c.color}`;
        d.setAttribute('data-symbol', getSym(c.value));
        d.innerText = getSym(c.value);
        d.onclick = () => playCard(i);
        handDiv.appendChild(d);
    });

    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : "🔴 TURNO DI " + players[currentPlayerIdx].nick;
}

function playCard(i) {
    if(!isMyTurn) return;
    const card = playerHand[i];

    // CUMULO +2
    if (drawStack > 0 && card.value !== "draw2") {
        showToast("Devi rispondere con un +2!");
        return;
    }

    // COMBO NUMERI (se attiva)
    if (gameSettings.ruleMulti && card.value === topCard.value && !["skip","reverse","draw2"].includes(card.value)) {
        let sameCards = playerHand.filter(c => c.value === card.value);
        playerHand = playerHand.filter(c => c.value !== card.value);
        topCard = sameCards[sameCards.length - 1];
        showToast("COMBO! Lanciate " + sameCards.length + " carte.");
    } 
    // MOSSA NORMALE
    else if (card.color === currentColor || card.value === topCard.value || card.color === "wild") {
        playerHand.splice(i, 1);
        topCard = card;
    } else return;

    currentColor = topCard.color;
    checkRules(card);

    if (card.color === "wild") {
        document.getElementById("colorPicker").classList.remove("hidden");
    } else {
        checkWin();
        if(gameActive) nextTurn(card.value === "skip");
    }
}

function checkRules(card) {
    if (card.value === "draw2") drawStack += 2;
    
    if (gameSettings.rule07) {
        if (card.value === "0") {
            showToast("ROTAZIONE MANI!");
            let hands = players.map(p => p.id === 'ME' ? [...playerHand] : [...p.hand]);
            hands.push(hands.shift());
            players.forEach((p, i) => { if(p.id === 'ME') playerHand = hands[i]; else p.hand = hands[i]; });
        }
        if (card.value === "7") {
            let target = prompt("Con quale giocatore vuoi scambiare? (1, 2, o 3)");
            let idx = parseInt(target);
            if(idx > 0 && idx < players.length) {
                let temp = [...playerHand];
                playerHand = players[idx].hand;
                players[idx].hand = temp;
                showToast("SCAMBIO EFFETTUATO!");
            }
        }
    }
}

function nextTurn(skip = false) {
    currentPlayerIdx = (currentPlayerIdx + (skip ? 2 : 1)) % players.length;
    isMyTurn = (players[currentPlayerIdx].id === 'ME');

    if (drawStack > 0) {
        let p = players[currentPlayerIdx];
        let pHand = (p.id === 'ME' ? playerHand : p.hand);
        if (!pHand.some(c => c.value === "draw2")) {
            showToast(p.nick + " pesca +" + drawStack);
            pHand.push(...draw(drawStack));
            drawStack = 0;
            nextTurn();
            return;
        }
    }

    renderGame();
    if (players[currentPlayerIdx].isBot && gameActive) setTimeout(botTurn, 1500);
}

function botTurn() {
    const bot = players[currentPlayerIdx];
    let idx = bot.hand.findIndex(c => (drawStack > 0 ? c.value === "draw2" : (c.color === currentColor || c.value === topCard.value || c.color === "wild")));
    
    if (idx !== -1) {
        let card = bot.hand.splice(idx, 1)[0];
        topCard = card;
        currentColor = (card.color === "wild") ? "red" : card.color;
        checkRules(card);
        checkWin();
        if(gameActive) nextTurn(card.value === "skip");
    } else {
        bot.hand.push(...draw(Math.max(1, drawStack)));
        drawStack = 0;
        nextTurn();
    }
}

function drawCard() {
    if(!isMyTurn) return;
    playerHand.push(...draw(drawStack || 1));
    drawStack = 0;
    nextTurn();
}

function checkWin() {
    let pHand = (players[currentPlayerIdx].id === 'ME') ? playerHand : players[currentPlayerIdx].hand;
    if (pHand.length === 0) {
        gameActive = false;
        showToast("🏆 HA VINTO " + players[currentPlayerIdx].nick + "!");
        setTimeout(() => location.reload(), 5000);
    }
}

window.setWildColor = (c) => { 
    currentColor = c; 
    document.getElementById("colorPicker").classList.add("hidden"); 
    checkWin(); 
    if(gameActive) nextTurn(); 
};
