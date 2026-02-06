// Stato del Gioco
let state = {
    nick: "",
    players: [],
    deck: [],
    hand: [],
    topCard: null,
    currentColor: "",
    turn: 0,
    stack: 0,
    settings: { bots: 3, rule07: false }
};

// Funzioni di Navigazione (Le chiamo direttamente dall'HTML)
function goTo(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function openSettings() { goTo('settingsScreen'); }
function closeSettings() { 
    state.settings.bots = parseInt(document.getElementById('botSelect').value);
    state.settings.rule07 = document.getElementById('chk07').checked;
    goTo('startScreen'); 
}

// Logica Iniziale
document.getElementById('loginBtn').onclick = () => {
    state.nick = document.getElementById('nickInput').value || "Giocatore";
    document.getElementById('welcomeText').innerText = "Ciao, " + state.nick;
    goTo('startScreen');
};

// Inizio Partita
document.getElementById('startGameBtn').onclick = () => {
    initGame();
    goTo('gameArea');
};

function initGame() {
    // Crea Mazzo
    state.deck = [];
    const colors = ['red', 'blue', 'green', 'yellow'];
    const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    colors.forEach(c => values.forEach(v => {
        state.deck.push({c, v});
        if(v !== '0') state.deck.push({c, v});
    }));
    for(let i=0; i<4; i++) state.deck.push({c:'wild', v:'W'});
    state.deck.sort(() => Math.random() - 0.5);

    // Distribuisci
    state.players = [{ n: state.nick, h: [], isBot: false }];
    for(let i=0; i < state.settings.bots; i++) {
        state.players.push({ n: "Bot " + (i+1), h: draw(7), isBot: true });
    }
    state.hand = draw(7);
    
    // Prima Carta
    state.topCard = state.deck.pop();
    while(state.topCard.c === 'wild') state.topCard = state.deck.pop();
    state.currentColor = state.topCard.c;
    state.turn = 0;
    
    render();
}

function draw(n) {
    let cards = [];
    for(let i=0; i<n; i++) if(state.deck.length) cards.push(state.deck.pop());
    return cards;
}

const getSym = (v) => (v === 'skip' ? '🚫' : v === 'reverse' ? '🔄' : v === 'draw2' ? '+2' : v);

function render() {
    // Scarto e Mazzo
    document.getElementById('discardPile').innerHTML = `
        <div class="card ${state.currentColor}" data-symbol="${getSym(state.topCard.v)}">${getSym(state.topCard.v)}</div>
    `;
    
    // Altri Giocatori
    const opps = document.getElementById('otherPlayers');
    opps.innerHTML = "";
    state.players.forEach((p, i) => {
        if(i !== 0) opps.innerHTML += `<div class="badge">${p.n}: ${p.h.length} 🎴</div>`;
    });

    // Mia Mano
    const handDiv = document.getElementById('playerHand');
    handDiv.innerHTML = "";
    state.hand.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = `card ${c.c}`;
        div.setAttribute('data-symbol', getSym(c.v));
        div.innerText = getSym(c.v);
        div.onclick = () => play(i);
        handDiv.appendChild(div);
    });

    document.getElementById('turnIndicator').innerText = state.turn === 0 ? "TOCCA A TE" : "TURNO DI " + state.players[state.turn].n;
}

function play(idx) {
    if(state.turn !== 0) return;
    const card = state.hand[idx];
    
    if(card.c === state.currentColor || card.v === state.topCard.v || card.c === 'wild') {
        state.hand.splice(idx, 1);
        state.topCard = card;
        state.currentColor = card.c;
        
        if(card.c === 'wild') {
            document.getElementById('colorPicker').classList.remove('hidden');
        } else {
            next(card.v === 'skip');
        }
    }
}

function userDraw() {
    if(state.turn !== 0) return;
    state.hand.push(...draw(1));
    next();
}

function next(skip = false) {
    state.turn = (state.turn + (skip ? 2 : 1)) % state.players.length;
    render();
    if(state.players[state.turn].isBot) setTimeout(botTurn, 1000);
}

function botTurn() {
    let bot = state.players[state.turn];
    let idx = bot.h.findIndex(c => c.c === state.currentColor || c.v === state.topCard.v || c.c === 'wild');
    
    if(idx !== -1) {
        let card = bot.h.splice(idx, 1)[0];
        state.topCard = card;
        state.currentColor = card.c === 'wild' ? ['red','blue','green','yellow'][Math.floor(Math.random()*4)] : card.c;
        next(card.v === 'skip');
    } else {
        bot.h.push(...draw(1));
        next();
    }
}

function setWildColor(col) {
    state.currentColor = col;
    document.getElementById('colorPicker').classList.add('hidden');
    next();
}
