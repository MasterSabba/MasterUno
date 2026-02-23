let myName = "", myId = "", peer, hasSaidUno = false;
let gameData = {
    players: [], hands: {}, deck: [], topCard: null,
    curColor: "", turn: 0, active: false, dir: 1,
    rules: { rule07: false, maxPlayers: 4 }
};

document.addEventListener("DOMContentLoaded", () => {
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
            el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, {passive: false});
        }
    };

    bind('enterBtn', () => {
        myName = document.getElementById('nickInput').value.trim().toUpperCase() || "PLAYER";
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        initPeer();
    });

    bind('settingsBtn', () => document.getElementById('settingsModal').classList.remove('hidden'));
    
    bind('saveSettings', () => {
        gameData.rules.rule07 = document.getElementById('check07').checked;
        gameData.rules.maxPlayers = parseInt(document.getElementById('numPlayersSelect').value);
        document.getElementById('settingsModal').classList.add('hidden');
        toast("IMPOSTAZIONI SALVATE");
    });

    bind('startMatchBtn', () => {
        gameData.players = [{id: myId, name: myName, isBot: false}];
        for(let i=1; i < gameData.rules.maxPlayers; i++) 
            gameData.players.push({id: 'bot-'+i, name: 'BOT '+i, isBot: true});
        prepareGame();
    });

    bind('deck', () => {
        if(gameData.turn === 0 && gameData.active) {
            let found = false;
            while(!found && gameData.deck.length > 0) {
                let c = gameData.deck.pop();
                gameData.hands[myId].push(c);
                if(isPlayable(c)) found = true;
            }
            render();
            if(!found) nextTurn();
        }
    });

    bind('masterUnoBtn', () => {
        hasSaidUno = true;
        toast("MASTER UNO! 🔥");
        document.getElementById('masterUnoBtn').classList.add('hidden');
    });

    bind('copyBtn', () => {
        navigator.clipboard.writeText(myId);
        toast("ID COPIATO");
    });
});

function isPlayable(c) {
    return c.color === gameData.curColor || c.value === gameData.topCard.value || c.color === "wild";
}

function prepareGame() {
    const colors = ["red", "blue", "green", "yellow"];
    const values = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
    gameData.deck = [];
    colors.forEach(c => values.forEach(v => gameData.deck.push({color: c, value: v})));
    for(let i=0; i<4; i++) gameData.deck.push({color: "wild", value: "W"});
    gameData.deck.sort(() => Math.random() - 0.5);

    gameData.players.forEach(p => {
        gameData.hands[p.id] = [];
        for(let i=0; i<7; i++) gameData.hands[p.id].push(gameData.deck.pop());
    });

    gameData.topCard = gameData.deck.pop();
    gameData.curColor = gameData.topCard.color === "wild" ? "red" : gameData.topCard.color;
    gameData.active = true;
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameArea').classList.remove('hidden');
    render();
}

function playCard(index) {
    const pId = gameData.players[gameData.turn].id;
    const hand = gameData.hands[pId];
    const card = hand[index];

    if (pId === myId && hand.length === 2 && !hasSaidUno) {
        toast("PENITENZA! +2");
        for(let i=0; i<2; i++) hand.push(gameData.deck.pop());
        render(); return;
    }

    if (isPlayable(card)) {
        gameData.topCard = card;
        hand.splice(index, 1);
        if (pId === myId) hasSaidUno = false;

        if (card.color === "wild") {
            if (!gameData.players[gameData.turn].isBot) {
                document.getElementById('colorPicker').classList.remove('hidden');
                return;
            } else {
                gameData.curColor = ["red","blue","green","yellow"][Math.floor(Math.random()*4)];
            }
        } else {
            gameData.curColor = card.color;
        }

        applyEffects(card);
        checkWin(pId);
        if (gameData.active) nextTurn();
    }
}

function applyEffects(card) {
    const count = gameData.players.length;
    if(card.value === "skip") gameData.turn = (gameData.turn + gameData.dir + count) % count;
    if(card.value === "reverse") gameData.dir *= -1;
    if(card.value === "draw2") {
        let nxt = (gameData.turn + gameData.dir + count) % count;
        for(let i=0; i<2; i++) gameData.hands[gameData.players[nxt].id].push(gameData.deck.pop());
        gameData.turn = nxt;
    }
    if(gameData.rules.rule07 && card.value === "0") {
        let hands = gameData.players.map(p => gameData.hands[p.id]);
        hands.push(hands.shift());
        gameData.players.forEach((p, i) => gameData.hands[p.id] = hands[i]);
    }
}

function nextTurn() {
    gameData.turn = (gameData.turn + gameData.dir + gameData.players.length) % gameData.players.length;
    render();
    if(gameData.players[gameData.turn].isBot) setTimeout(botLogic, 1000);
}

function botLogic() {
    const bot = gameData.players[gameData.turn];
    const hand = gameData.hands[bot.id];
    let idx = hand.findIndex(c => isPlayable(c));

    while(idx === -1 && gameData.deck.length > 0) {
        hand.push(gameData.deck.pop());
        idx = hand.findIndex(c => isPlayable(c));
    }

    if(idx !== -1) {
        if(hand.length === 2) toast(bot.name + ": UNO!");
        playCard(idx);
    } else {
        nextTurn();
    }
}

function selectNewColor(c) {
    gameData.curColor = c;
    document.getElementById('colorPicker').classList.add('hidden');
    nextTurn();
}

function checkWin(pId) {
    if(gameData.hands[pId].length === 0) {
        gameData.active = false;
        if(pId === myId) {
            let pts = parseInt(localStorage.getItem('mu_pts') || 0) + 100;
            localStorage.setItem('mu_pts', pts);
            alert("HAI VINTO! PUNTI: " + pts);
        } else {
            alert("HA VINTO " + pId);
        }
        location.reload();
    }
}

function render() {
    const handDiv = document.getElementById('playerHand');
    const oppArea = document.getElementById('opponentsArea');
    handDiv.innerHTML = ""; oppArea.innerHTML = "";

    gameData.players.forEach((p, i) => {
        if(p.id !== myId) {
            const div = document.createElement('div');
            div.className = `opp-mini ${gameData.turn === i ? 'active-p' : ''}`;
            div.innerHTML = `<div>${p.name}</div><div>🎴 ${gameData.hands[p.id].length}</div>`;
            oppArea.appendChild(div);
        }
    });

    gameData.hands[myId].forEach((c, i) => {
        const div = document.createElement('div');
        div.className = `card ${c.color}`;
        div.innerText = c.value === "draw2" ? "+2" : (c.value === "skip" ? "🚫" : (c.value === "reverse" ? "⇄" : c.value));
        div.onclick = () => { if(gameData.turn === 0) playCard(i); };
        handDiv.appendChild(div);
    });

    document.getElementById('discardPile').innerHTML = `<div class="card ${gameData.curColor}">${gameData.topCard.value}</div>`;
    document.getElementById('turnIndicator').innerText = gameData.turn === 0 ? "🟢 TOCCA A TE" : "🔴 TURNO AVVERSARIO";
    document.getElementById('playerBadge').innerText = `TU: ${gameData.hands[myId].length}`;
}

function initPeer() {
    peer = new Peer(Math.random().toString(36).substr(2, 5).toUpperCase());
    peer.on('open', id => { myId = id; document.getElementById('myPeerId').innerText = "ID: " + id; });
}

function toast(m) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = m;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 2000);
}
