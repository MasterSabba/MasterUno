let peer, myNick, players = [], deck = [], playerHand = [], topCard = null;
let currentColor = "", drawStack = 0, currentPlayerIdx = 0, gameActive = false;
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 4 };

// --- UTILS ---
const getSym = (v) => {
    if(v === "skip") return "🚫";
    if(v === "reverse") return "🔄";
    if(v === "draw2") return "+2";
    return v;
};

function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2000);
}

window.sendChat = (e) => showToast(myNick + ": " + e);

// --- LOGIN ---
document.getElementById("loginBtn").onclick = () => {
    myNick = document.getElementById("nickInput").value.trim();
    if(!myNick) return;
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("welcomeText").innerText = "Ciao, " + myNick;
    peer = new Peer(myNick.toUpperCase() + "-" + Math.floor(Math.random()*999));
    peer.on('open', id => document.getElementById("myPeerId").innerText = id);
};

// --- LOGICA GIOCO ---
document.getElementById("startGameBtn").onclick = () => {
    gameActive = true;
    createDeck();
    players = [{ nick: myNick, id: 'ME', hand: [] }];
    for(let i=0; i < (gameSettings.maxPlayers - 1); i++) 
        players.push({ nick: "Bot " + (i+1), id: 'BOT'+i, isBot: true, hand: draw(7) });
    
    playerHand = draw(7);
    topCard = deck.pop();
    while(topCard.color === "wild") topCard = deck.pop();
    currentColor = topCard.color;
    
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
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
    for(let i=0; i<n; i++) {
        if(deck.length === 0) createDeck();
        res.push(deck.pop());
    }
    return res;
}

function renderGame() {
    // Centro
    document.getElementById("discardPile").innerHTML = `<div class="card ${currentColor}" data-symbol="${getSym(topCard.value)}">${getSym(topCard.value)}</div>`;
    document.getElementById("deckArea").innerHTML = `<div class="card-back-deck" onclick="drawCard()">MASTER<br>UNO</div>`;
    
    // Altri
    const oppRow = document.getElementById("otherPlayers");
    oppRow.innerHTML = "";
    players.forEach(p => { if(p.id !== 'ME') oppRow.innerHTML += `<div class="opp-badge">${p.nick}<br>🎴 ${p.hand.length}</div>`; });

    // Mano
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

    const isMyTurn = (players[currentPlayerIdx].id === 'ME');
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 TOCCA A TE" : "🔴 TURNO DI " + players[currentPlayerIdx].nick;
}

function playCard(i) {
    if(players[currentPlayerIdx].id !== 'ME') return;
    const card = playerHand[i];

    if (drawStack > 0 && card.value !== "draw2") return showToast("Devi rispondere al +2!");

    if (card.color === currentColor || card.value === topCard.value || card.color === "wild") {
        playerHand.splice(i, 1);
        topCard = card;
        currentColor = card.color;
        
        if (card.value === "draw2") drawStack += 2;
        if (gameSettings.rule07 && card.value === "7") {
            let t = prompt("Con chi scambi? (1, 2 o 3)");
            let idx = parseInt(t);
            if(idx > 0 && idx < players.length) {
                let temp = [...playerHand]; playerHand = players[idx].hand; players[idx].hand = temp;
                showToast("SCAMBIO!");
            }
        }
        
        if (card.color === "wild") {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            nextTurn(card.value === "skip");
        }
    }
}

function nextTurn(skip = false) {
    currentPlayerIdx = (currentPlayerIdx + (skip ? 2 : 1)) % players.length;
    let p = players[currentPlayerIdx];
    
    if (drawStack > 0) {
        let pHand = (p.id === 'ME' ? playerHand : p.hand);
        if (!pHand.some(c => c.value === "draw2")) {
            showToast(p.nick + " pesca +" + drawStack);
            pHand.push(...draw(drawStack));
            drawStack = 0;
            return nextTurn();
        }
    }

    renderGame();
    if (p.isBot && gameActive) setTimeout(botTurn, 1500);
}

function botTurn() {
    const bot = players[currentPlayerIdx];
    let idx = bot.hand.findIndex(c => (drawStack > 0 ? c.value === "draw2" : (c.color === currentColor || c.value === topCard.value || c.color === "wild")));
    
    if (idx !== -1) {
        let card = bot.hand.splice(idx, 1)[0];
        topCard = card;
        currentColor = (card.color === "wild") ? "red" : card.color;
        if (card.value === "draw2") drawStack += 2;
        nextTurn(card.value === "skip");
    } else {
        bot.hand.push(...draw(Math.max(1, drawStack)));
        drawStack = 0;
        nextTurn();
    }
}

function drawCard() {
    if(players[currentPlayerIdx].id !== 'ME') return;
    playerHand.push(...draw(drawStack || 1));
    drawStack = 0;
    nextTurn();
}

window.setWildColor = (c) => { 
    currentColor = c; 
    document.getElementById("colorPicker").classList.add("hidden"); 
    nextTurn(); 
};

// Impostazioni
document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsModal").classList.remove("hidden");
document.getElementById("saveSettings").onclick = () => {
    gameSettings.rule07 = document.getElementById("rule07").checked;
    gameSettings.ruleMulti = document.getElementById("ruleMulti").checked;
    gameSettings.maxPlayers = parseInt(document.getElementById("maxPlayersSelect").value);
    document.getElementById("settingsModal").classList.add("hidden");
    showToast("Salvato!");
};
