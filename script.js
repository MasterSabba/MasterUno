const game = {
    peer: null, conn: null,
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, 
        rule07: true, drawUntilPlay: true, limit: 4
    },

    login() {
        const n = document.getElementById('nickInput').value.trim();
        if(n.length < 2) return;
        this.state.nick = n;
        this.state.myId = n.toUpperCase() + "_" + Math.floor(100 + Math.random() * 899);
        document.getElementById('myId').innerText = this.state.myId;
        
        this.peer = new Peer(this.state.myId);
        this.peer.on('connection', (c) => {
            this.conn = c;
            this.setupPeer();
            this.notify("Amico collegato!");
        });
        this.goTo('menuScreen');
    },

    connectToPeer() {
        const id = document.getElementById('joinId').value.trim();
        if(!id) return;
        this.conn = this.peer.connect(id);
        this.setupPeer();
    },

    setupPeer() {
        this.conn.on('data', (data) => {
            if(data.type === 'START') { this.state = data.state; this.goTo('gameArea'); this.render(); }
        });
    },

    startGame() {
        this.state.limit = parseInt(document.getElementById('playerLimit').value);
        this.state.rule07 = document.getElementById('rule07').checked;
        this.state.drawUntilPlay = document.getElementById('drawUntilPlay').checked;
        
        this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        
        // Se c'è un amico connesso occupa il posto del Bot 2 (Sopra)
        if(this.conn) this.state.players.push({ name: this.conn.peer.split('_')[0], hand: [], isBot: false });

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
        const values = ['0','1','2','3','4','5','6','7','8','9','Ø','⇄','+2'];
        this.state.deck = [];
        colors.forEach(c => values.forEach(v => {
            this.state.deck.push({c, v});
            if(v !== '0') this.state.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'W'});
        this.state.deck.sort(() => Math.random() - 0.5);

        this.state.players.forEach(p => p.hand = this.draw(7));
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        this.state.turn = 0;
    },

    draw(n) {
        let res = [];
        for(let i=0; i<n; i++) {
            if(this.state.deck.length === 0) this.initGame();
            res.push(this.state.deck.pop());
        }
        return res;
    },

    render() {
        // Pulizia slot
        ['bot-left', 'bot-top', 'bot-right'].forEach(id => document.getElementById(id).innerHTML = "");

        // Logica Posizioni (Senso Orario: Sinistra -> Sopra -> Destra)
        let posMap = [];
        if(this.state.limit == 2) posMap = [{id: 'bot-top', idx: 1}];
        if(this.state.limit == 3) posMap = [{id: 'bot-left', idx: 1}, {id: 'bot-right', idx: 2}];
        if(this.state.limit == 4) posMap = [{id: 'bot-left', idx: 1}, {id: 'bot-top', idx: 2}, {id: 'bot-right', idx: 3}];

        posMap.forEach(pos => {
            const p = this.state.players[pos.idx];
            if(!p) return;
            const slot = document.getElementById(pos.id);
            // Badge Orizzontale per i laterali
            let html = `<div class="status-badge">${p.name}: ${p.hand.length}</div><div class="opp-hand">`;
            p.hand.forEach(() => html += `<div class="card card-back opp-card"></div>`);
            html += `</div>`;
            slot.innerHTML = html;
        });

        // Mia Mano e Badge a Lato
        document.getElementById('myBadge').innerText = `TU: ${this.state.players[0].hand.length}`;
        const handEl = document.getElementById('myHand');
        handEl.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = `card ${c.c}`;
            div.setAttribute('data-val', c.v);
            div.innerText = c.v === 'W' ? '🎨' : c.v;
            div.onclick = () => this.playCard(i);
            handEl.appendChild(div);
        });

        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}" data-val="${this.state.discard.v}">${this.state.discard.v === 'W' ? '🎨' : this.state.discard.v}</div>`;
        document.getElementById('turnIndicator').innerText = this.state.turn === 0 ? "TUO TURNO" : "TURNO DI " + this.state.players[this.state.turn].name;
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const card = this.state.players[0].hand[i];
        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            this.state.players[0].hand.splice(i, 1);
            this.state.discard = card;
            this.state.color = card.c === 'wild' ? this.state.color : card.c;
            this.nextTurn(card.v === 'Ø');
        }
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        
        if(this.state.drawUntilPlay) {
            let drawn = null;
            // Pesca finché non trova una carta giocabile
            while(true) {
                drawn = this.draw(1)[0];
                p.hand.push(drawn);
                if(drawn.c === this.state.color || drawn.v === this.state.discard.v || drawn.c === 'wild') break;
            }
            this.notify("Hai pescato finché non hai trovato una mossa!");
        } else {
            p.hand.push(...this.draw(1));
        }
        this.render();
        // Dopo la pesca (o la serie di pesche), il turno finisce se non hai giocato subito (automatico qui per semplicità)
        setTimeout(() => this.nextTurn(), 500);
    },

    nextTurn(skip) {
        this.state.turn = (this.state.turn + (skip ? 2 : 1)) % this.state.players.length;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1200);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        if(idx !== -1) {
            const card = b.hand.splice(idx, 1)[0];
            this.state.discard = card;
            this.state.color = card.c === 'wild' ? 'red' : card.c;
            this.nextTurn(card.v === 'Ø');
        } else {
            b.hand.push(...this.draw(1));
            this.nextTurn();
        }
    },

    goTo(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); },
    notify(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), 2000); },
    copyId() { navigator.clipboard.writeText(this.state.myId); this.notify("ID Copiato!"); }
};
