let peer, myNick, connections = [], players = [];
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 4 };
let deck = [], playerHand = [], topCard = null, currentColor = "";
let isMyTurn = false, currentPlayerIdx = 0, gameActive = false;

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
        updateStatus();
        conn.on('data', d => handleData(d));
    });
}

// --- LOGICA MAZZO E REGOLE ---
document.getElementById("startGameBtn").onclick = () => {
    gameActive = true;
    createDeck();
    players = [{ nick: myNick, id: 'ME', hand: [], isBot: false }];
    
    const botNeeded = gameSettings.maxPlayers - (connections.length + 1);
    for(let i=0; i < botNeeded; i++) {
        players.push({ nick: "Bot " + (i + 1), id: 'BOT-' + i, isBot: true, hand: draw(7) });
    }

    playerHand = draw(7);
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;

    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
    currentPlayerIdx = 0;
    isMyTurn = true;
    renderGame();
};

function createDeck() {
    deck = [];
    const colors = ["red", "blue", "green", "yellow"];
    const vals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "draw2"];
    colors.forEach(c => vals.forEach(v => {
        deck.push({color: c, value: v});
        if(v !== "0") deck.push({color: c, value: v});
    }));
    for(let i=0; i<4; i++) {
        deck.push({color: "wild", value: "W"});
        deck.push({color: "wild4", value: "W4"});
    }
    deck.sort(() => Math.random() - 0.5);
}

function draw(n) {
    let cards = [];
    for(let i=0; i<n; i++) if(deck.length > 0) cards.push(deck.pop());
    return cards;
}

// --- AZIONI DI GIOCO ---
function renderGame() {
    const disc = document.getElementById("discardPile");
    disc.innerHTML = `<div class="card ${currentColor}" data-value="${topCard.value}">${topCard.value}</div>`;
    
    const handDiv = document.getElementById("playerHand");
    handDiv.innerHTML = "";
    playerHand.forEach((c, i) => {
        const d = document.createElement("div");
        d.className = `card ${c.color}`;
        d.setAttribute('data-value', c.value);
        d.innerText = c.value;
        d.onclick = () => playCard(i);
        handDiv.appendChild(d);
    });

    const oppDiv = document.getElementById("otherPlayers");
    oppDiv.innerHTML = "";
    players.forEach(p => {
        if(p.id !== 'ME') {
            oppDiv.innerHTML += `<div class="opp-badge"><small>${p.nick}</small><br>🎴 ${p.hand.length}</div>`;
        }
    });
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 IL TUO TURNO" : `🔴 TURNO DI ${players[currentPlayerIdx].nick}`;
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];

    // COMBO: Butta tutti i numeri uguali
    if (gameSettings.ruleMulti && card.value === topCard.value && card.value !== "draw2" && card.value !== "skip") {
        let sameCards = playerHand.filter(c => c.value === card.value);
        playerHand = playerHand.filter(c => c.value !== card.value);
        topCard = sameCards[sameCards.length - 1];
        showToast(`COMBO! Lanciati ${sameCards.length} "${card.value}"`);
    } 
    else if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1);
        topCard = card;
    } else return;

    currentColor = topCard.color;
    checkSpecialAction(card);

    if (card.color.includes("wild")) {
        document.getElementById("colorPicker").classList.remove("hidden");
    } else {
        checkWin();
        if(gameActive) nextTurn();
    }
}

function checkSpecialAction(card) {
    let nextIdx = (currentPlayerIdx + 1) % players.length;
    
    // +2 FUNZIONANTE
    if (card.value === "draw2") {
        let penalty = draw(2);
        if (players[nextIdx].id === 'ME') playerHand.push(...penalty);
        else players[nextIdx].hand.push(...penalty);
        showToast(`+2 per ${players[nextIdx].nick}!`);
    }

    // REGOLA 0-7
    if (gameSettings.rule07) {
        if (card.value === "0") {
            showToast("ROTAZIONE MANI!");
            let firstHand = [...playerHand];
            for(let i=0; i<players.length-1; i++) {
                if(i===0) playerHand = players[1].hand;
                else players[i].hand = players[i+1].hand;
            }
            players[players.length-1].hand = firstHand;
        }
        if (card.value === "7") {
            showToast("SCAMBIO MANO!");
            let targetIdx = (currentPlayerIdx + 1) % players.length;
            let myTemp = [...playerHand];
            playerHand = players[targetIdx].hand;
            players[targetIdx].hand = myTemp;
        }
    }
}

function nextTurn() {
    currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
    isMyTurn = (players[currentPlayerIdx].id === 'ME');
    renderGame();
    if (players[currentPlayerIdx].isBot && gameActive) setTimeout(botTurn, 1500);
}

function botTurn() {
    const bot = players[currentPlayerIdx];
    let idx = bot.hand.findIndex(c => c.color === currentColor || c.value === topCard.value || c.color.includes("wild"));
    
    if (idx !== -1) {
        let card = bot.hand.splice(idx, 1)[0];
        topCard = card;
        currentColor = card.color.includes("wild") ? "red" : card.color;
        checkSpecialAction(card);
    } else {
        bot.hand.push(...draw(1));
    }
    checkWin();
    if(gameActive) nextTurn();
}

function drawCard() {
    if(!isMyTurn) return;
    playerHand.push(...draw(1));
    nextTurn();
}

// --- UTILITY ---
function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity="0"; setTimeout(()=>t.remove(),500); }, 2000);
}

function checkWin() {
    let winner = players.find(p => (p.id === 'ME' ? playerHand : p.hand).length === 0);
    if (winner) {
        gameActive = false;
        showToast("HA VINTO " + winner.nick + "!");
        confetti();
        setTimeout(() => location.reload(), 5000);
    }
}

document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsModal").classList.remove("hidden");
document.getElementById("saveSettings").onclick = () => {
    gameSettings.rule07 = document.getElementById("rule07").checked;
    gameSettings.ruleMulti = document.getElementById("ruleMulti").checked;
    gameSettings.maxPlayers = parseInt(document.getElementById("maxPlayersSelect").value);
    document.getElementById("settingsModal").classList.add("hidden");
    showToast("Regole Salvate");
};

window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    checkWin();
    if(gameActive) nextTurn();
};
