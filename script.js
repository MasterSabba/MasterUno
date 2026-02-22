let peer, conn = [], myId, isHost = false;
let gameState = {
    players: [], // {id, name, cardsCount, isBot}
    deck: [],
    hands: {},
    turn: 0,
    dir: 1,
    topCard: null,
    curCol: '',
    stack: 0,
    rules: { rule07: false, ruleStack: true, ruleCombo: false, maxP: 4 }
};

// --- LOGIN & INIZIALIZZAZIONE ---
document.getElementById('loginBtn').onclick = () => {
    const name = document.getElementById('lName').value || "Player";
    document.getElementById('sLogin').style.display = 'none';
    initPeer(name);
};

function initPeer(name) {
    peer = new Peer();
    peer.on('open', id => {
        myId = id;
        document.getElementById('myCode').innerText = id;
        document.getElementById('sLobby').style.display = 'flex';
        gameState.players.push({id, name, cards: 7, isBot: false});
        updatePlayerList();
    });

    peer.on('connection', c => {
        if (gameState.players.length < gameState.rules.maxP) {
            conn.push(c);
            setupConn(c);
        }
    });
}

// --- GESTIONE IMPOSTAZIONI ---
document.getElementById('openSettings').onclick = () => {
    document.getElementById('settingsPanel').style.display = 'flex';
};

document.getElementById('closeSettings').onclick = () => {
    gameState.rules.maxP = parseInt(document.getElementById('setPlayers').value);
    gameState.rules.rule07 = document.getElementById('rule07').checked;
    gameState.rules.ruleStack = document.getElementById('ruleStack').checked;
    gameState.rules.ruleCombo = document.getElementById('ruleCombo').checked;
    document.getElementById('settingsPanel').style.display = 'none';
    toast("Impostazioni salvate!");
};

// --- AVVIO GIOCO (Host aggiunge bot se mancano player) ---
document.getElementById('startBtn').onclick = () => {
    isHost = true;
    while (gameState.players.length < gameState.rules.maxP) {
        gameState.players.push({id: 'bot-'+Math.random(), name: "Bot "+(gameState.players.length), isBot: true, cards: 7});
    }
    startGame();
};

function startGame() {
    // Genera Mazzo, Distribuisce Mani, Sincronizza tutti
    // Logica di gioco complessa qui...
    document.getElementById('sLobby').style.display = 'none';
    document.getElementById('sGame').style.display = 'flex';
    toast("Partita Iniziata!");
    renderGame();
}

// --- CHAT & EMOJI ---
function sendEmoji(emoji) {
    const msg = { type: 'chat', content: emoji, sender: myId };
    if (isHost) broadcast(msg); else conn[0].send(msg);
    showEmoji(emoji);
}

function showEmoji(emoji) {
    const el = document.createElement('div');
    el.innerText = emoji;
    el.className = "floating-emoji";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

// --- LOGICA REGOLE SPECIALI ---
function handleSpecialCards(card) {
    if (card.v === '0' && gameState.rules.rule07) {
        // Logica rotazione mani a tutti
        rotateAllHands();
    }
    if (card.v === '7' && gameState.rules.rule07) {
        // Scegli con chi scambiare
        toast("Scegli un giocatore per scambiare la mano!");
    }
}

// --- UTILITY ---
function toast(txt) {
    const t = document.createElement('div');
    t.className = 'toast'; t.innerText = txt;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(myId);
    toast("Codice Copiato! Inviaro agli amici.");
};
