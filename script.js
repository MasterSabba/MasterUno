let peer, conn, myId, isHost = false, myName = "Player";
let deck = [], hands = [[], []], turn = 0, topCard, curCol, active = false;

// SALVATAGGIO AUTOMATICO
function updateWins(win) {
    let w = parseInt(localStorage.getItem('mu_wins') || 0);
    if(win) { w++; localStorage.setItem('mu_wins', w); }
    document.getElementById('winCount').innerText = w;
}

// NAVIGAZIONE E UI
function go(id) {
    document.querySelectorAll('.scr').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
}

function toast(m) {
    const t = document.createElement('div'); t.className='toast'; t.innerText=m;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// LOGICA GIOCO
function createDeck() {
    const colors = ['red','blue','green','yellow'];
    let d = [];
    colors.forEach(c => {
        for(let i=0; i<=9; i++) d.push({c, v:i.toString()});
        ['skip','draw2'].forEach(v => d.push({c, v}));
    });
    for(let i=0; i<4; i++) d.push({c:'wild', v:'W'});
    return d.sort(() => Math.random() - 0.5);
}

function startMP(asHost) {
    isHost = asHost;
    deck = createDeck();
    hands = [ [], [] ];
    for(let i=0; i<7; i++) { hands[0].push(deck.pop()); hands[1].push(deck.pop()); }
    topCard = deck.pop();
    curCol = topCard.c === 'wild' ? 'red' : topCard.c;
    active = true;
    broadcastState();
    render();
}

function render() {
    const hEl = document.getElementById('myHand');
    hEl.innerHTML = '';
    const myIdx = isHost ? 0 : 1;
    hands[myIdx].forEach((card, i) => {
        const c = document.createElement('div');
        c.className = `card ${card.c}`;
        c.innerText = card.v === 'W' ? '🎨' : card.v;
        c.onclick = () => playCard(myIdx, i);
        hEl.appendChild(c);
    });
    
    document.getElementById('discardEl').innerHTML = `<div class="card ${curCol}">${topCard.v === 'W' ? '🎨' : topCard.v}</div>`;
    document.getElementById('tbadge').innerText = (turn === myIdx) ? "TUO TURNO" : "ATTESA...";
    document.getElementById('myBadge').innerText = `CARTE: ${hands[myIdx].length}`;
}

function playCard(pIdx, cIdx) {
    if(turn !== pIdx || !active) return;
    const card = hands[pIdx][cIdx];
    
    if(card.c === 'wild' || card.c === curCol || card.v === topCard.v) {
        hands[pIdx].splice(cIdx, 1);
        topCard = card;
        if(card.c !== 'wild') curCol = card.c;
        
        if(hands[pIdx].length === 0) {
            updateWins(true);
            confetti();
            go('sEnd');
            return;
        }
        
        if(card.c === 'wild') {
            document.getElementById('colorPicker').style.display = 'flex';
        } else {
            turn = 1 - turn;
            if(conn) broadcastState();
            render();
        }
    }
}

function pickColor(c) {
    curCol = c;
    document.getElementById('colorPicker').style.display = 'none';
    turn = 1 - turn;
    broadcastState();
    render();
}

// NETWORKING
function broadcastState() {
    if(conn && conn.open) {
        conn.send({ deck, hands, topCard, curCol, turn, active });
    }
}

document.getElementById('loginBtn').onclick = () => {
    myName = document.getElementById('lName').value || "Player";
    updateWins(false);
    peer = new Peer();
    peer.on('open', id => {
        myId = id;
        document.getElementById('myCode').innerText = id;
        go('sLobby');
    });
    peer.on('connection', c => {
        conn = c; setupConn();
        startMP(true);
        go('sGame');
    });
};

document.getElementById('connectBtn').onclick = () => {
    const fId = document.getElementById('friendId').value;
    conn = peer.connect(fId);
    setupConn();
    go('sGame');
};

function setupConn() {
    conn.on('data', data => {
        deck = data.deck; hands = data.hands;
        topCard = data.topCard; curCol = data.curCol;
        turn = data.turn; active = data.active;
        render();
    });
}

document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(myId);
    toast("Codice Copiato!");
};
