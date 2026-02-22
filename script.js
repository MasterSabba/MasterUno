let myName = "", myId = "", peer, conn = [], isHost = false;
let gameData = {
    players: [], hands: {}, deck: [], topCard: null, 
    curColor: "", turn: 0, dir: 1, stack: 0, 
    rules: { rule07: false, stack: true }, active: false
};

window.onload = () => {
    // Gestione Impostazioni
    const sModal = document.getElementById('settingsModal');
    document.getElementById('settingsBtn').onclick = () => sModal.classList.remove('hidden');
    document.getElementById('saveSettings').onclick = () => {
        gameData.rules.rule07 = document.getElementById('check07').checked;
        gameData.rules.stack = document.getElementById('checkStack').checked;
        sModal.classList.add('hidden');
        toast("IMPOSTAZIONI SALVATE");
    };

    // Login
    document.getElementById('enterBtn').onclick = () => {
        myName = document.getElementById('nickInput').value.trim().toUpperCase() || "PLAYER";
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        initPeer();
    };

    // Copia ID
    document.getElementById('copyBtn').onclick = () => {
        navigator.clipboard.writeText(myId);
        toast("ID COPIATO!");
    };

    // Start Game (con BOT)
    document.getElementById('startMatchBtn').onclick = () => {
        isHost = true;
        gameData.players = [{id: myId, name: myName, isBot: false}];
        for(let i=1; i<=3; i++) gameData.players.push({id: 'bot-'+i, name: 'BOT '+i, isBot: true});
        prepareGame();
    };
};

function initPeer() {
    peer = new Peer(Math.random().toString(36).substr(2, 5).toUpperCase());
    peer.on('open', id => { myId = id; document.getElementById('myPeerId').innerText = id; });
}

function prepareGame() {
    // Crea mazzo base
    const colors = ["red", "blue", "green", "yellow"];
    gameData.deck = [];
    colors.forEach(c => {
        for(let i=0; i<=9; i++) gameData.deck.push({color: c, value: i.toString()});
    });
    gameData.deck.sort(() => Math.random() - 0.5);

    // Distribuisci
    gameData.players.forEach(p => {
        gameData.hands[p.id] = [];
        for(let i=0; i<7; i++) gameData.hands[p.id].push(gameData.deck.pop());
    });

    gameData.topCard = gameData.deck.pop();
    gameData.curColor = gameData.topCard.color;
    gameData.active = true;

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameArea').classList.remove('hidden');
    render();
}

function render() {
    const handDiv = document.getElementById('playerHand');
    const oppArea = document.getElementById('opponentsArea');
    handDiv.innerHTML = ""; oppArea.innerHTML = "";

    // Avversari
    gameData.players.forEach((p, i) => {
        if(p.id !== myId) {
            const div = document.createElement('div');
            div.className = `opp-mini ${gameData.turn === i ? 'active-p' : ''}`;
            div.innerHTML = `<div>${p.name}</div><div>🎴 ${gameData.hands[p.id].length}</div>`;
            oppArea.appendChild(div);
        }
    });

    // Mia Mano
    gameData.hands[myId].forEach((card, index) => {
        const div = document.createElement('div');
        div.className = `card ${card.color}`;
        div.innerText = card.value;
        div.onclick = () => { if(gameData.turn === 0) playCard(index); };
        handDiv.appendChild(div);
    });

    document.getElementById('playerBadge').innerText = `TU: ${gameData.hands[myId].length}`;
    document.getElementById('discardPile').innerHTML = `<div class="card ${gameData.curColor}">${gameData.topCard.value}</div>`;
    
    const activeP = gameData.players[gameData.turn];
    document.getElementById('turnIndicator').innerText = activeP.id === myId ? "🟢 TOCCA A TE" : "🔴 TURNO DI " + activeP.name;
}

function playCard(index) {
    const pId = gameData.players[gameData.turn].id;
    const card = gameData.hands[pId][index];

    if(card.color === gameData.curColor || card.value === gameData.topCard.value) {
        gameData.topCard = card;
        gameData.curColor = card.color;
        gameData.hands[pId].splice(index, 1);
        nextTurn();
    } else {
        toast("MOSSA NON VALIDA");
    }
}

function nextTurn() {
    gameData.turn = (gameData.turn + 1) % gameData.players.length;
    render();
    if(gameData.players[gameData.turn].isBot) setTimeout(botLogic, 1200);
}

function botLogic() {
    const bot = gameData.players[gameData.turn];
    const hand = gameData.hands[bot.id];
    const idx = hand.findIndex(c => c.color === gameData.curColor || c.value === gameData.topCard.value);

    if(idx !== -1) {
        gameData.topCard = hand[idx];
        gameData.curColor = hand[idx].color;
        hand.splice(idx, 1);
    } else {
        hand.push(gameData.deck.pop()); // Bot pesca se non ha carte
    }
    nextTurn();
}

function toast(m) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = m;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

function sendEmoji(e) { toast(myName + ": " + e); }
