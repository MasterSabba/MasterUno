const game = {
    peer: null, conn: null,
    state: {
        nick: "", myId: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, limit: 4
    },

    login() {
        const n = document.getElementById('nickInput').value.trim();
        if(n.length < 2) return;
        this.state.nick = n;
        this.state.myId = n.toUpperCase() + "_" + Math.floor(100 + Math.random() * 899);
        document.getElementById('myPeerIdDisplay').innerText = this.state.myId;
        
        this.peer = new Peer(this.state.myId);
        this.peer.on('connection', (c) => {
            this.conn = c;
            this.setupMultiplayer();
            this.notify("AMICO CONNESSO!");
        });
        this.goTo('menuScreen');
    },

    connectToPeer() {
        const id = document.getElementById('joinId').value.trim();
        if(!id || id === this.state.myId) return this.notify("ID NON VALIDO!");
        this.conn = this.peer.connect(id);
        this.setupMultiplayer();
    },

    setupMultiplayer() {
        this.conn.on('data', (data) => {
            if(data.type === 'START') {
                this.state = data.state;
                this.goTo('gameArea');
                this.render();
            }
        });
    },

    startGame() {
        this.state.limit = parseInt(document.getElementById('playerLimit').value);
        this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        
        if(this.conn) {
            this.state.players.push({ name: this.conn.peer.split('_')[0], hand: [], isBot: false });
        }

        while(this.state.players.length < this.state.limit) {
            this.state.players.push({ name: 'BOT ' + this.state.players.length, hand: [], isBot: true });
        }

        this.initGame();
        if(this.conn) this.conn.send({ type: 'START', state: this.state });
        this.goTo('gameArea');
        this.render();
    },

    initGame() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const values = ['0','1','2','3','4','5','6','7','8','9','🚫','🔄','+2'];
        this.state.deck = [];
        colors.forEach(c => values.forEach(v => {
            this.state.deck.push({c, v});
            if(v !== '0') this.state.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'🎨'});
        this.state.deck.sort(() => Math.random() - 0.5);

        this.state.players.forEach(p => p.hand = this.draw(7));
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        this.state.turn = 0;
    },

    draw(n) {
        let res = [];
        for(let i=0; i<n; i++) res.push(this.state.deck.pop());
        return res;
    },

    render() {
        const slots = ['slot-1', 'slot-2', 'slot-3'];
        slots.forEach(s => document.getElementById(s).innerHTML = "");

        let sIdx = 0;
        this.state.players.forEach((p, i) => {
            if(i === 0) return;
            const el = document.getElementById(slots[sIdx++]);
            if(!el) return;
            el.innerHTML = `
                <div class="status-badge" style="border-color:${this.state.turn === i ? 'white' : 'transparent'}">
                    ${p.name}: ${p.hand.length}
                </div>
                <div class="card card-back">
                    <div class="card-logo">MASTER<span>UNO</span></div>
                </div>
            `;
        });

        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;
        
        const handEl = document.getElementById('myHand');
        handEl.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = `card ${c.c}`;
            div.innerText = c.v;
            div.onclick = () => this.playCard(i);
            handEl.appendChild(div);
        });

        document.getElementById('turnIndicator').innerText = this.state.turn === 0 ? "TUO TURNO" : "TURNO DI " + this.state.players[this.state.turn].name;
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const card = this.state.players[0].hand[i];
        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            this.state.players[0].hand.splice(i, 1);
            this.state.discard = card;
            this.state.color = card.c;
            if(card.c === 'wild') document.getElementById('colorPicker').classList.remove('hidden');
            else this.nextTurn();
        }
    },

    nextTurn() {
        this.state.turn = (this.state.turn + 1) % this.state.players.length;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1000);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        if(idx !== -1) {
            const card = b.hand.splice(idx, 1)[0];
            this.state.discard = card;
            this.state.color = card.c === 'wild' ? 'red' : card.c;
        } else b.hand.push(...this.draw(1));
        this.nextTurn();
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        this.state.players[0].hand.push(...this.draw(1));
        this.nextTurn();
    },

    setWildColor(c) { this.state.color = c; document.getElementById('colorPicker').classList.add('hidden'); this.nextTurn(); },
    notify(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), 2000); },
    copyId() { navigator.clipboard.writeText(this.state.myId); this.notify("ID COPIATO!"); },
    goTo(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
};
