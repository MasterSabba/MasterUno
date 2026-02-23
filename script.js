// --- SISTEMA DI DEBUG ---
function debug(msg) {
    console.log(msg);
    // Crea un piccolo log a schermo per vedere se il JS carica sul cell
    let log = document.getElementById('debug-log');
    if(!log) {
        log = document.createElement('div');
        log.id = 'debug-log';
        log.style = "position:fixed; bottom:0; left:0; font-size:10px; color:lime; z-index:9999; background:rgba(0,0,0,0.5); pointer-events:none;";
        document.body.appendChild(log);
    }
    log.innerText = "Log: " + msg;
}

// --- STATO GIOCO ---
let myName = "", myId = "", peer;
let gameData = {
    players: [], hands: {}, deck: [], topCard: null, 
    curColor: "", turn: 0, active: false, rules: { rule07: false, stack: true }
};

// --- ATTIVAZIONE TASTI (METODO SICURO) ---
document.addEventListener("DOMContentLoaded", () => {
    debug("Pagina Caricata");

    // Helper per collegare i tasti in modo che funzionino su Touch e Mouse
    const bindBtn = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
            el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, {passive: false});
        } else {
            debug("Errore: " + id + " non trovato");
        }
    };

    // Collegamento Funzioni ai Tasti
    bindBtn('enterBtn', () => {
        myName = document.getElementById('nickInput').value.trim().toUpperCase() || "PLAYER";
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        initPeer();
        debug("Entrato come " + myName);
    });

    bindBtn('settingsBtn', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
        debug("Apri Impostazioni");
    });

    bindBtn('saveSettings', () => {
        gameData.rules.rule07 = document.getElementById('check07').checked;
        gameData.rules.stack = document.getElementById('checkStack').checked;
        document.getElementById('settingsModal').classList.add('hidden');
        toast("IMPOSTAZIONI SALVATE");
    });

    bindBtn('startMatchBtn', () => {
        debug("Avvio Partita...");
        gameData.players = [{id: myId, name: myName, isBot: false}];
        for(let i=1; i<=3; i++) gameData.players.push({id: 'bot-'+i, name: 'BOT '+i, isBot: true});
        prepareGame();
    });

    bindBtn('copyBtn', () => {
        navigator.clipboard.writeText(myId);
        toast("ID COPIATO");
    });
});

// --- LOGICA CORE ---
function initPeer() {
    peer = new Peer(Math.random().toString(36).substr(2, 5).toUpperCase());
    peer.on('open', id => { 
        myId = id; 
        document.getElementById('myPeerId').innerText = id;
        debug("ID Peer: " + id);
    });
}

function prepareGame() {
    // Mazzo Base
    const colors = ["red", "blue", "green", "yellow"];
    gameData.deck = [];
    colors.forEach(c => {
        for(let i=0; i<=9; i++) gameData.deck.push({color: c, value: i.toString()});
    });
    gameData.deck.sort(() => Math.random() - 0.5);

    // Distribuzione
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
    handDiv.innerHTML = ""; 
    oppArea.innerHTML = "";

    // Rendering Bot
    gameData.players.forEach((p, i) => {
        if(p.id !== myId) {
            const div = document.createElement('div');
            div.className = `opp-mini ${gameData.turn === i ? 'active-p' : ''}`;
            div.innerHTML = `<div>${p.name}</div><div>🎴 ${gameData.hands[p.id].length}</div>`;
            oppArea.appendChild(div);
        }
    });

    // Rendering Mia Mano
    const myHand = gameData.hands[myId] || [];
    myHand.forEach((card, index) => {
        const div = document.createElement('div');
        div.className = `card ${card.color}`;
        div.innerText = card.value;
        
        // Touch per giocare carta
        div.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if(gameData.turn === 0) playCard(index);
        });
        div.onclick = () => { if(gameData.turn === 0) playCard(index); };
        
        handDiv.appendChild(div);
    });

    document.getElementById('playerBadge').innerText = `TU: ${myHand.length}`;
    document.getElementById('discardPile').innerHTML = `<div class="card ${gameData.curColor}">${gameData.topCard.value}</div>`;
    
    const activeP = gameData.players[gameData.turn];
    document.getElementById('turnIndicator').innerText = activeP.id === myId ? "🟢 TOCCA A TE" : "🔴 TURNO DI " + activeP.name;
}

function playCard(index) {
    const card = gameData.hands[myId][index];
    if(card.color === gameData.curColor || card.value === gameData.topCard.value) {
        gameData.topCard = card;
        gameData.curColor = card.color;
        gameData.hands[myId].splice(index, 1);
        nextTurn();
    } else {
        toast("MOSSA NON VALIDA");
    }
}

function nextTurn() {
    gameData.turn = (gameData.turn + 1) % gameData.players.length;
    render();
    if(gameData.players[gameData.turn].isBot) setTimeout(botLogic, 1000);
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
        if(gameData.deck.length > 0) hand.push(gameData.deck.pop());
    }
    nextTurn();
}

function toast(m) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = m;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 2000);
}
