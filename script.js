const game = {
    peer: null, conn: null,
    state: {
        nick: "", myId: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0,
        settings: { limit: 4, rule07: true, stacking: true }
    },

    login() {
        const n = document.getElementById('nickInput').value.trim();
        if(n.length < 2) return;
        this.state.nick = n;
        this.state.myId = n.toUpperCase().slice(0,3) + Math.floor(100+Math.random()*899);
        document.getElementById('myId').innerText = this.state.myId;
        document.getElementById('welcomeText').innerText = "CIAO " + n.toUpperCase();
        
        this.peer = new Peer(this.state.myId);
        this.peer.on('connection', (c) => {
            this.conn = c;
            this.notify("Amico Connesso!");
            this.conn.on('data', (d) => {
                if(d.type === 'START') { this.state = d.state; this.goTo('gameArea'); this.render(); }
            });
        });
        this.goTo('menuScreen');
    },

    connectToPeer() {
        const id = document.getElementById('joinId').value.trim();
        if(!id || id === this.state.myId) return this.notify("ID Non Valido!");
        this.conn = this.peer.connect(id);
        this.notify("Connessione in corso...");
    },

    startGame() {
        this.state.settings.limit = parseInt(document.getElementById('playerLimit').value);
        this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        
        if(this.conn) this.state.players.push({ name: this.conn.peer.split('_')[0], hand: [], isBot: false });
        
        while(this.state.players.length < this.state.settings.limit) {
            this.state.players.push({ name: 'Bot ' + this.state.players.length, hand: [], isBot: true });
        }

        this.initDeck();
        this.state.players.forEach(p => p.hand = this.draw(7));
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        
        if(this.conn) this.conn.send({ type: 'START', state: this.state });
        this.goTo('gameArea');
        this.render();
    },

    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const values = ['0','1','2','3','4','5','6','7','8','9','Ø','⇄','+2'];
        this.state.deck = [];
        colors.forEach(c => values.forEach(v => {
            this.state.deck.push({c, v});
            if(v !== '0') this.state.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'+4'});
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    draw(n) {
        let res = [];
        for(let i=0; i<n; i++) {
            if(this.state.deck.length === 0) this.initDeck();
            res.push(this.state.deck.pop());
        }
        return res;
    },

    render() {
        // Pulizia bot
        ['bot-left', 'bot-top', 'bot-right'].forEach(id => {
            const el = document.getElementById(id);
            el.innerHTML = ""; el.classList.remove('active-turn');
        });

        // Mapping Bot (2 players: top | 3 players: left-right | 4 players: left-top-right)
        const mapping = this.state.settings.limit == 2 ? [{id:'bot-top', idx:1}] : 
                        this.state.settings.limit == 3 ? [{id:'bot-left', idx:1}, {id:'bot-right', idx:2}] :
                        [{id:'bot-left', idx:1}, {id:'bot-top', idx:2}, {id:'bot-right', idx:3}];

        mapping.forEach(m => {
            const p = this.state.players[m.idx];
            if(!p) return;
            const el = document.getElementById(m.id);
            if(this.state.turn === m.idx) el.classList.add('active-turn');
            let cardsHTML = "";
            p.hand.forEach(() => cardsHTML += `<div class="card card-back" style="margin-left:-55px"><div class="master-back">MasterUno</div></div>`);
            el.innerHTML = `<div class="status-badge">${p.name}: ${p.hand.length}</div><div style="display:flex; margin-left:55px">${cardsHTML}</div>`;
        });

        // Player
        const handEl = document.getElementById('myHand');
        handEl.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = `card ${c.c}`;
            div.setAttribute('data-val', c.v);
            div.innerText = c.v;
            div.onclick = () => this.playCard(i);
            handEl.appendChild(div);
        });

        document.getElementById('myBadge').innerText = `TU: ${this.state.players[0].hand.length}`;
        const mySlot = document.querySelector('.player-bottom');
        this.state.turn === 0 ? mySlot.classList.add('active-turn') : mySlot.classList.remove('active-turn');

        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}" data-val="${this.state.discard.v}">${this.state.discard.v}</div>`;
        document.getElementById('turnIndicator').innerText = "TURNO DI: " + this.state.players[this.state.turn].name;
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const card = this.state.players[0].hand[i];
        
        if(this.state.stack > 0 && card.v !== '+2' && card.v !== '+4') return this.notify("Devi rispondere al +!");

        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild' || card.v === '+4') {
            this.state.players[0].hand.splice(i, 1);
            this.processMove(card);
        }
    },

    processMove(card) {
        this.state.discard = card;
        if(card.v === '+2') this.state.stack += 2;
        if(card.v === '+4') this.state.stack += 4;
        if(card.c !== 'wild' && card.v !== '+4') this.state.color = card.c;
        if(card.v === '⇄') this.state.dir *= -1;

        if(card.v === 'wild' || card.v === '+4') {
            document.getElementById('colorPicker').classList.remove('hidden');
        } else {
            this.nextTurn(card.v === 'Ø');
        }
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        
        if(this.state.stack > 0) {
            p.hand.push(...this.draw(this.state.stack));
            this.state.stack = 0;
            this.nextTurn();
        } else {
            let drawn;
            do {
                drawn = this.draw(1)[0];
                p.hand.push(drawn);
            } while(!(drawn.c === this.state.color || drawn.v === this.state.discard.v || drawn.c === 'wild' || drawn.v === '+4'));
            this.render();
            setTimeout(() => this.nextTurn(), 800);
        }
    },

    nextTurn(skip) {
        const n = this.state.players.length;
        this.state.turn = (this.state.turn + (skip ? 2 : 1) * this.state.dir + n) % n;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1200);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild' || c.v === '+4');
        
        if(idx !== -1 && this.state.stack === 0) {
            const card = b.hand.splice(idx, 1)[0];
            if(card.v === '+4' || card.v === 'wild') this.state.color = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
            this.processMove(card);
        } else {
            b.hand.push(...this.draw(this.state.stack || 1));
            this.state.stack = 0;
            this.nextTurn();
        }
    },

    sendEmoji(e) { this.notify(this.state.nick + ": " + e); },
    setWildColor(c) { this.state.color = c; document.getElementById('colorPicker').classList.add('hidden'); this.nextTurn(); },
    notify(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), 2000); },
    copyId() { navigator.clipboard.writeText(this.state.myId); this.notify("ID Copiato!"); },
    goTo(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
};
