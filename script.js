const game = {
    peer: null,
    conn: null,
    state: {
        nick: "",
        myId: "",
        players: [], // {name, hand, isBot, conn}
        deck: [],
        discard: null,
        color: "",
        turn: 0,
        dir: 1, // 1 orario, -1 antiorario
        stack: 0,
        rule07: false,
        playerLimit: 4
    },

    login() {
        const val = document.getElementById('nickInput').value.trim();
        if(val.length < 2) return this.notify("Inserisci un nome valido!");
        
        this.state.nick = val;
        // ID con nome e numeri casuali come richiesto
        this.state.myId = val + "_" + Math.floor(1000 + Math.random() * 9000);
        
        document.getElementById('welcomeText').innerText = "Ciao, " + val;
        document.getElementById('myPeerIdDisplay').innerText = this.state.myId;
        
        // Inizializza PeerJS per il multiplayer
        this.peer = new Peer(this.state.myId);
        this.peer.on('connection', (c) => this.handleIncomingConn(c));
        
        this.goTo('menuScreen');
    },

    notify(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 2500);
    },

    copyId() {
        navigator.clipboard.writeText(this.state.myId);
        this.notify("ID Copiato!");
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    saveSettings() {
        this.state.playerLimit = parseInt(document.getElementById('playerLimit').value);
        this.state.rule07 = document.getElementById('rule07Check').checked;
        this.notify("Impostazioni salvate!");
        this.goTo('menuScreen');
    },

    // Logica Dinamica Bot/Amici
    startGame() {
        // Se siamo soli, aggiungiamo i bot fino al limite
        if (this.state.players.length === 0) {
            this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        }

        // Aggiungi bot mancanti per raggiungere il playerLimit
        const currentCount = this.state.players.length;
        const botsNeeded = this.state.playerLimit - currentCount;

        for (let i = 1; i <= botsNeeded; i++) {
            this.state.players.push({ name: 'Bot ' + i, hand: [], isBot: true });
        }

        this.initGame();
    },

    connectToPeer() {
        const remoteId = document.getElementById('joinId').value.trim();
        if(!remoteId) return this.notify("Inserisci un ID!");
        
        const c = this.peer.connect(remoteId);
        this.handleIncomingConn(c);
        this.notify("Connessione in corso...");
    },

    handleIncomingConn(c) {
        c.on('open', () => {
            this.state.players.push({ name: c.peer.split('_')[0], hand: [], isBot: false, conn: c });
            this.notify("Amico connesso!");
        });
    },

    initGame() {
        this.createDeck();
        this.state.players.forEach(p => p.hand = this.draw(7));
        
        // Prima carta (non speciale)
        let first = this.state.deck.pop();
        while(first.c === 'wild' || isNaN(first.v)) {
            this.state.deck.unshift(first);
            first = this.state.deck.pop();
        }
        
        this.state.discard = first;
        this.state.color = first.c;
        this.state.turn = 0;
        this.state.dir = 1; // Inizia in senso orario
        this.state.stack = 0;
        
        this.goTo('gameArea');
        this.render();
    },

    createDeck() {
        const cols = ['red', 'blue', 'green', 'yellow'];
        const vals = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
        this.state.deck = [];
        cols.forEach(c => vals.forEach(v => {
            this.state.deck.push({c, v}); 
            if(v !== '0') this.state.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'W'});
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    draw(n) {
        let res = [];
        for(let i=0; i<n; i++) {
            if(this.state.deck.length === 0) this.createDeck();
            res.push(this.state.deck.pop());
        }
        return res;
    },

    render() {
        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}">${this.getSym(this.state.discard.v)}</div>`;
        document.getElementById('directionIndicator').className = (this.state.dir === 1) ? 'dir-cw' : 'dir-ccw';

        const slots = ['playerTop', 'playerLeft', 'playerRight'];
        let sIdx = 0;
        
        // Pulizia slot
        slots.forEach(s => document.getElementById(s).innerHTML = "");

        this.state.players.forEach((p, i) => {
            if(i === 0) return; // Salta te stesso
            const el = document.getElementById(slots[sIdx++]);
            if(!el) return;
            
            el.innerHTML = `
                <div class="bot-badge">${p.name} (${p.hand.length})</div>
                <div class="card card-back"><div class="card-logo">MASTER<span>UNO</span></div></div>
            `;
            el.style.opacity = (this.state.turn === i) ? "1" : "0.5";
            if(this.state.turn === i) el.querySelector('.bot-badge').style.borderColor = "white";
        });

        const handEl = document.getElementById('myHand');
        handEl.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = `card ${c.c}`;
            div.innerText = this.getSym(c.v);
            div.onclick = () => this.playCard(i);
            handEl.appendChild(div);
        });

        document.getElementById('statusInfo').innerText = (this.state.turn === 0) ? "TOCCA A TE" : "TURNO DI " + this.state.players[this.state.turn].name;
    },

    playCard(idx) {
        if(this.state.turn !== 0) return;
        const card = this.state.players[0].hand[idx];
        
        // Controllo +2 cumulativo
        if(this.state.stack > 0 && card.v !== 'draw2') return this.notify("Devi rispondere con un +2!");

        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            this.state.players[0].hand.splice(idx, 1);
            this.processMove(card);
        }
    },

    processMove(card) {
        this.state.discard = card;
        this.state.color = (card.c === 'wild') ? this.state.color : card.c;
        
        if(card.v === 'draw2') this.state.stack += 2;
        if(card.v === 'reverse') this.state.dir *= -1;

        // Regola 0-7
        if(this.state.rule07) {
            if(card.v === '0') this.handleZero();
            if(card.v === '7') this.handleSeven();
        }

        if(this.state.players[this.state.turn].hand.length === 0) {
            document.getElementById('winMessage').innerText = this.state.players[this.state.turn].isBot ? "HA VINTO " + this.state.players[this.state.turn].name : "HAI VINTO!";
            return this.goTo('winScreen');
        }

        if(card.c === 'wild') {
            document.getElementById('colorPicker').classList.remove('hidden');
        } else {
            this.nextTurn(card.v === 'skip');
        }
    },

    nextTurn(skip) {
        const n = this.state.players.length;
        this.state.turn = (this.state.turn + (skip ? 2 : 1) * this.state.dir + n) % n;
        
        // Verifica se il giocatore deve pescare per il +2
        if(this.state.stack > 0) {
            const p = this.state.players[this.state.turn];
            if(!p.hand.some(c => c.v === 'draw2')) {
                p.hand.push(...this.draw(this.state.stack));
                this.notify(p.name + " pesca " + this.state.stack + " carte!");
                this.state.stack = 0;
                return this.nextTurn();
            }
        }

        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1500);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        let idx = b.hand.findIndex(c => (this.state.stack > 0 ? c.v === 'draw2' : (c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild')));
        
        if(idx !== -1) {
            const card = b.hand.splice(idx, 1)[0];
            if(card.c === 'wild') card.c = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
            this.processMove(card);
        } else {
            b.hand.push(...this.draw(this.state.stack || 1));
            this.state.stack = 0;
            this.nextTurn();
        }
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        this.state.players[0].hand.push(...this.draw(this.state.stack || 1));
        this.state.stack = 0;
        this.nextTurn();
    },

    handleZero() {
        const hands = this.state.players.map(p => p.hand);
        if(this.state.dir === 1) hands.unshift(hands.pop());
        else hands.push(hands.shift());
        this.state.players.forEach((p, i) => p.hand = hands[i]);
        this.notify("Rotazione Mani (0)!");
    },

    handleSeven() {
        // Scambia mano con il giocatore successivo per semplicità
        let target = (this.state.turn + this.state.dir + this.state.players.length) % this.state.players.length;
        let tmp = this.state.players[this.state.turn].hand;
        this.state.players[this.state.turn].hand = this.state.players[target].hand;
        this.state.players[target].hand = tmp;
        this.notify("Mani Scambiate (7)!");
    },

    getSym: (v) => (v==='draw2'?'+2':v==='skip'?'🚫':v==='reverse'?'🔄':v==='W'?'🎨':v),
    setWildColor(c) { 
        this.state.color = c; 
        document.getElementById('colorPicker').classList.add('hidden'); 
        this.nextTurn(); 
    }
};
