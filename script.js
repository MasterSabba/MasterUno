let peer, myNick, connections = [], players = [];
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 4 };
let deck = [], playerHand = [], topCard = null, currentColor = "";
let isMyTurn = false, currentPlayerIdx = 0, gameActive = false, drawStack = 0;

// --- EMOJI FIX ---
window.sendChat = (e) => showToast(myNick + ": " + e);

// --- SIMBOLI ---
const getSymbol = (v) => {
    if(v === "skip") return "🚫";
    if(v === "reverse") return "🔄";
    if(v === "draw2") return "+2";
    return v;
};

// --- LOGIN ---
document.getElementById("loginBtn").onclick = () => {
    myNick = document.getElementById("nickInput").value.trim() || "Player";
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    initPeer();
};

function initPeer() {
    peer = new Peer(myNick.toUpperCase() + "-" + Math.floor(Math.random()*999));
    peer.on('open', id => document.getElementById("myPeerId").innerText = id);
    peer.on('connection', conn => { connections.push(conn); updateStatus(); conn.on('data', d => handleData(d)); });
}

// --- AVVIO GIOCO ---
document.getElementById("startGameBtn").onclick = () => {
    gameActive = true;
    createDeck();
    players = [{ nick: myNick, id: 'ME', hand: [] }];
    for(let i=0; i < (gameSettings.maxPlayers - 1); i++) 
        players.push({ nick: "Bot " + (i+1), id: 'BOT'+i, isBot: true, hand: draw(7) });
    
    playerHand = draw(7);
    topCard = deck.pop();
    while(topCard.value === "draw2" || topCard.color === "wild") topCard = deck.pop();
    currentColor = topCard.color;
    renderGame();
};

function renderGame() {
    // Tavolo Centrale
    document.getElementById("discardPile").innerHTML = `<div class="card ${currentColor}" data-symbol="${getSymbol(topCard.value)}">${getSymbol(topCard.value)}</div>`;
    
    // Posizionamento Circolare
    const slots = ["pos-bottom", "pos-left", "pos-top", "pos-right"];
    slots.forEach(s => document.getElementById(s).innerHTML = "");

    players.forEach((p, i) => {
        const slot = document.getElementById(slots[i]);
        if (p.id === 'ME') {
            let html = `<div class="name-label">${p.nick}</div><div class="hand">`;
            playerHand.forEach((c, idx) => {
                html += `<div class="card ${c.color}" data-symbol="${getSymbol(c.value)}" onclick="playCard(${idx})">${getSymbol(c.value)}</div>`;
            });
            slot.innerHTML = html + `</div>`;
        } else {
            let cardsHtml = `<div class="mini-hand">` + `<div class="mini-card"></div>`.repeat(p.hand.length) + `</div>`;
            slot.innerHTML = `<div class="name-label">${p.nick} (🎴${p.hand.length})</div>${cardsHtml}`;
        }
    });
    
    document.title = isMyTurn ? "Tocca a te!" : "Attesa...";
}

function playCard(i) {
    if(!isMyTurn) return;
    const card = playerHand[i];

    // CUMULO +2
    if (drawStack > 0 && card.value !== "draw2") {
        showToast("Devi rispondere con un +2 o pescare!");
        return;
    }

    if (card.color === currentColor || card.value === topCard.value || card.color === "wild") {
        playerHand.splice(i, 1);
        topCard = card;
        currentColor = card.color;

        if (card.value === "draw2") drawStack += 2;
        if (card.value === "7" && gameSettings.rule07) { openPlayerPicker(); return; }
        if (card.value === "0" && gameSettings.rule07) rotateHands();

        if (card.color === "wild") document.getElementById("colorPicker").classList.remove("hidden");
        else nextTurn(card.value === "skip");
    }
}

function nextTurn(skipped = false) {
    currentPlayerIdx = (currentPlayerIdx + (skipped ? 2 : 1)) % players.length;
    isMyTurn = (players[currentPlayerIdx].id === 'ME');
    
    // Se il giocatore deve subire il +2 accumulato
    if (drawStack > 0 && players[currentPlayerIdx].hand) {
        let p = players[currentPlayerIdx];
        let hasDraw2 = (p.id === 'ME' ? playerHand : p.hand).some(c => c.value === "draw2");
        if (!hasDraw2) {
            showToast(`${p.nick} subisce +${drawStack}!`);
            let cards = draw(drawStack);
            if(p.id === 'ME') playerHand.push(...cards); else p.hand.push(...cards);
            drawStack = 0;
            nextTurn();
            return;
        }
    }

    renderGame();
    if (players[currentPlayerIdx].isBot && gameActive) setTimeout(botTurn, 1200);
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
    if(!isMyTurn) return;
    playerHand.push(...draw(drawStack || 1));
    drawStack = 0;
    nextTurn();
}

// --- REGOLE SPECIALI ---
function openPlayerPicker() {
    let html = `<div id="playerPicker"><h3>Con chi vuoi scambiare?</h3>`;
    players.forEach((p, i) => {
        if(p.id !== 'ME') html += `<button class="btn-yellow" onclick="swapHand(${i})">${p.nick}</button>`;
    });
    document.body.insertAdjacentHTML('beforeend', html + `</div>`);
}

window.swapHand = (idx) => {
    let temp = [...playerHand];
    playerHand = players[idx].hand;
    players[idx].hand = temp;
    document.getElementById("playerPicker").remove();
    showToast("Mani scambiate!");
    nextTurn();
};

function rotateHands() {
    let allHands = players.map(p => p.id === 'ME' ? [...playerHand] : [...p.hand]);
    allHands.push(allHands.shift());
    players.forEach((p, i) => {
        if(p.id === 'ME') playerHand = allHands[i]; else p.hand = allHands[i];
    });
}

// --- UTILITY ---
function createDeck() {
    const cols = ["red", "blue", "green", "yellow"];
    const nums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
    deck = [];
    cols.forEach(c => nums.forEach(n => { deck.push({color:c, value:n}); if(n!=="0") deck.push({color:c, value:n}); }));
    for(let i=0; i<4; i++) deck.push({color:"wild", value:"W"});
    deck.sort(() => Math.random() - 0.5);
}
function draw(n) { let res = []; for(let i=0; i<n; i++) if(deck.length) res.push(deck.pop()); return res; }
function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
}
window.setWildColor = (c) => { currentColor = c; document.getElementById("colorPicker").classList.add("hidden"); nextTurn(); };
