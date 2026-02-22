// VARIABILI GLOBALI
let myName = "", myId = "", peer, conn = [], isHost = false;
let gameData = {
    players: [], hands: {}, deck: [], topCard: null, 
    curColor: "", turn: 0, dir: 1, stack: 0, 
    rules: { rule07: false, stack: true, maxP: 4 },
    active: false
};

// --- INIZIALIZZAZIONE ALL'AVVIO ---
window.onload = () => {
    console.log("JS CARICATO CORRETTAMENTE");
    
    // LOGIN CLICK
    document.getElementById('enterBtn').addEventListener('click', () => {
        myName = document.getElementById('nickInput').value.trim().toUpperCase() || "PLAYER";
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        initPeer();
    });

    // COPIA ID
    document.getElementById('copyBtn').addEventListener('click', () => {
        const idText = document.getElementById('myPeerId').innerText;
        navigator.clipboard.writeText(idText);
        toast("ID Copiato!");
    });

    // AVVIA PARTITA
    document.getElementById('startMatchBtn').addEventListener('click', () => {
        isHost = true;
        gameData.players = [{id: myPeerId.innerText, name: myName, isBot: false}];
        
        // Aggiungi Bot per arrivare a 4
        while(gameData.players.length < 4) {
            gameData.players.push({id: 'bot-'+Math.random(), name: 'BOT '+gameData.players.length, isBot: true});
        }
        
        prepareGame();
    });
};

function initPeer() {
    peer = new Peer(Math.random().toString(36).substr(2, 5).toUpperCase());
    peer.on('open', id => {
        myId = id;
        document.getElementById('myPeerId').innerText = id;
    });
    peer.on('connection', c => {
        conn.push(c);
        toast("Giocatore connesso!");
    });
}

function prepareGame() {
    gameData.deck = []; // Qui andrebbe la funzione createDeck()
    const colors = ["red", "blue", "green", "yellow"];
    for(let c of colors) for(let i=0; i<=9; i++) gameData.deck.push({color: c, value: i.toString()});
    gameData.deck.sort(() => Math.random() - 0.5);

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
    handDiv.innerHTML = "";
    
    const myHand = gameData.hands[myId] || [];
    myHand.forEach(card => {
        const div = document.createElement('div');
        div.className = `card ${card.color} drawing`;
        div.innerText = card.value;
        handDiv.appendChild(div);
    });

    document.getElementById('playerBadge').innerText = `TU: ${myHand.length}`;
    document.getElementById('discardPile').innerHTML = `<div class="card ${gameData.curColor}">${gameData.topCard.value}</div>`;
    document.getElementById('turnIndicator').innerText = "PARTITA INIZIATA";
}

function toast(m) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = m;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 2000);
}
