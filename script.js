const game = {
    peer: null,
    conn: null,
    state: {
        nick: "", myId: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0, rule07: false, playerLimit: 4
    },

    login() {
        const val = document.getElementById('nickInput').value.trim();
        if(val.length < 2) return;
        this.state.nick = val;
        this.state.myId = val + "_" + Math.floor(1000 + Math.random() * 9000);
        document.getElementById('welcomeText').innerText = "Ciao, " + val;
        document.getElementById('myPeerIdDisplay').innerText = this.state.myId;
        
        this.peer = new Peer(this.state.myId);
        this.peer.on('connection', (c) => {
            this.conn = c;
            this.setupConn();
            this.notify("Amico connesso!");
        });
        this.goTo('menuScreen');
    },

    setupConn() {
        this.conn.on('data', (data) => {
            if(data.type === 'START') {
                this.state = data.state;
                this.goTo('gameArea');
                this.render();
            }
        });
    },

    connectToPeer() {
        const id = document.getElementById('joinId').value.trim();
        this.conn = this.peer.connect(id);
        this.setupConn();
        this.notify("Connessione...");
    },

    startGame() {
        // Creazione giocatori: Tu + Amico (se c'è) + Bot mancanti
        this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        
        if(this.conn) {
            this.state.players.push({ name: this.conn.peer.split('_')[0], hand: [], isBot: false });
        }

        while(this.state.players.length < this.state.playerLimit) {
            this.state.players.push({ name: 'Bot ' + this.state.players.length, hand: [], isBot: true });
        }

        this.initGame();

        // Invia comando di inizio all'amico
        if(this.conn) {
            this.conn.send({ type: 'START', state: this.state });
        }
    },

    initGame() {
        this.createDeck();
        this.state.players.forEach(p => p.hand = this.draw(7));
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c;
        this.state.turn = 0;
        this.state.dir = 1;
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
        const slots = ['playerTop', 'playerLeft', 'playerRight'];
        let sIdx = 0;
        
        // Pulizia slot
        slots.forEach(s => document.getElementById(s).innerHTML = "");

        this.state.players.forEach((p, i) => {
            if(i === 0) return;
            const el = document.getElementById(slots[sIdx++]);
            if(!el) return;
            el.innerHTML = `
                <div class="bot-badge">${p.name} (${p.hand.length})</div>
                <div class="card card-back"><div class="card-logo">MASTER<span>UNO</span></div></div>
            `;
            el.style.opacity = (this.state.turn === i) ? "1" : "0.5";
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
        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            this.state.players[0].hand.splice(idx, 1);
            this.processMove(card);
        }
    },

    processMove(card) {
        this.state.discard = card;
        this.state.color = (card.c === 'wild') ? this.state.color : card.c;
        if(card.v === 'reverse') this.state.dir *= -1;
        if(card.v === 'draw2') this.state.stack += 2;
        
        if(this.state.players[this.state.turn].hand.length === 0) {
            document.getElementById('winMessage').innerText = "FINE PARTITA";
            return this.goTo('winScreen');
        }

        if(card.c === 'wild') document.getElementById('colorPicker').classList.remove('hidden');
        else this.nextTurn(card.v === 'skip');
    },

    nextTurn(skip) {
        const n = this.state.players.length;
        this.state.turn = (this.state.turn + (skip ? 2 : 1) * this.state.dir + n) % n;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1000);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        let idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        if(idx !== -1) {
            const card = b.hand.splice(idx, 1)[0];
            if(card.c === 'wild') card.c = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
            this.processMove(card);
        } else {
            b.hand.push(...this.draw(1));
            this.nextTurn();
        }
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        this.state.players[0].hand.push(...this.draw(1));
        this.nextTurn();
    },

    getSym: (v) => (v==='draw2'?'+2':v==='skip'?'🚫':v==='reverse'?'🔄':v==='W'?'🎨':v),
    setWildColor(c) { this.state.color = c; document.getElementById('colorPicker').classList.add('hidden'); this.nextTurn(); },
    notify(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), 2000); },
    saveSettings() { this.state.playerLimit = document.getElementById('playerLimit').value; this.goTo('menuScreen'); },
    copyId() { navigator.clipboard.writeText(this.state.myId); this.notify("ID Copiato!"); }
};
