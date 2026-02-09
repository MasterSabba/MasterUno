const game = {
    peer: null, conn: null,
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0,
        settings: { limit: 4, stacking: true, rule07: true, drawUntil: true }
    },

    login() {
        const n = document.getElementById('nickInput').value.trim();
        if(n.length < 2) return;
        this.state.nick = n;
        this.state.myId = n.toUpperCase().substring(0,3) + Math.floor(100 + Math.random()*899);
        document.getElementById('myId').innerText = this.state.myId;
        document.getElementById('welcomeText').innerText = "BENVENUTO, " + n;
        
        this.peer = new Peer(this.state.myId);
        this.peer.on('connection', (c) => {
            this.conn = c;
            this.notify("Amico connesso!");
            this.conn.on('data', (d) => this.handlePeerData(d));
        });
        this.goTo('menuScreen');
    },

    handlePeerData(data) {
        if(data.type === 'START') { this.state = data.state; this.goTo('gameArea'); this.render(); }
        if(data.type === 'EMOJI') this.showEmoji(data.sender, data.emoji);
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
        for(let i=0; i<n; i++) res.push(this.state.deck.pop() || {c:'red', v:'0'});
        return res;
    },

    async animateDraw(playerIdx) {
        const deckPos = document.getElementById('deck').getBoundingClientRect();
        let targetId = "myHand";
        if(playerIdx === 1) targetId = "bot-left";
        if(playerIdx === 2) targetId = "bot-top";
        if(playerIdx === 3) targetId = "bot-right";
        
        const targetPos = document.getElementById(targetId).getBoundingClientRect();

        const card = document.createElement('div');
        card.className = "card card-back flying-card";
        card.style.left = deckPos.left + "px";
        card.style.top = deckPos.top + "px";
        document.body.appendChild(card);

        await new Promise(r => setTimeout(r, 10));
        card.style.left = targetPos.left + "px";
        card.style.top = targetPos.top + "px";
        card.style.transform = "rotate(360deg) scale(0.2)";
        
        setTimeout(() => card.remove(), 600);
    },

    render() {
        const slots = ['bot-left', 'bot-top', 'bot-right'];
        slots.forEach(id => {
            const el = document.getElementById(id);
            el.innerHTML = ""; el.className = "player-slot " + el.classList[1];
        });

        const mapping = this.state.limit == 2 ? [1] : [1, 2, 3];
        mapping.forEach((pIdx, uiIdx) => {
            const p = this.state.players[pIdx];
            if(!p) return;
            const slot = document.getElementById(slots[uiIdx]);
            if(this.state.turn === pIdx) slot.classList.add('active-turn');
            
            let html = `<div class="status-badge">${p.name}: ${p.hand.length}</div><div class="opp-hand">`;
            p.hand.forEach(() => html += `<div class="card card-back opp-card"><div class="master-back">MasterUno</div></div>`);
            slot.innerHTML = html + "</div>";
        });

        // Mia Mano
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
        if(this.state.turn === 0) document.body.classList.add('my-turn'); else document.body.classList.remove('my-turn');
        
        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}" data-val="${this.state.discard.v}">${this.state.discard.v}</div>`;
        document.getElementById('turnIndicator').innerText = "TURNO DI: " + this.state.players[this.state.turn].name;
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const card = this.state.players[0].hand[i];
        
        // Logica stacking
        if(this.state.stack > 0) {
            if(card.v !== '+2' && card.v !== '+4') return this.notify("Devi rispondere al +!");
        }

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

    async userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        
        // Se c'è uno stack di +2/+4
        if(this.state.stack > 0) {
            for(let i=0; i<this.state.stack; i++) {
                await this.animateDraw(0);
                p.hand.push(this.draw(1)[0]);
            }
            this.state.stack = 0;
            this.nextTurn();
        } else {
            // Pesca a strascico
            let canPlay = false;
            while(!canPlay) {
                await this.animateDraw(0);
                const c = this.draw(1)[0];
                p.hand.push(c);
                if(c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild' || c.v === '+4') canPlay = true;
                this.render();
            }
        }
        this.render();
    },

    nextTurn(skip) {
        const n = this.state.players.length;
        this.state.turn = (this.state.turn + (skip ? 2 : 1) * this.state.dir + n) % n;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1500);
    },

    async botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild' || c.v === '+4');
        
        if(idx !== -1 && this.state.stack === 0) {
            const card = b.hand.splice(idx, 1)[0];
            if(card.v === '+4' || card.v === 'wild') this.state.color = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
            this.processMove(card);
        } else {
            // Bot pesca
            const drawCount = this.state.stack > 0 ? this.state.stack : 1;
            for(let i=0; i<drawCount; i++) {
                await this.animateDraw(this.state.turn);
                b.hand.push(this.draw(1)[0]);
            }
            this.state.stack = 0;
            this.nextTurn();
        }
    },

    sendEmoji(e) {
        this.showEmoji(0, e);
        if(this.conn) this.conn.send({ type: 'EMOJI', sender: 1, emoji: e });
    },

    showEmoji(pIdx, e) {
        const el = pIdx === 0 ? document.getElementById('myEmoji') : document.getElementById('toast'); 
        el.innerText = e; el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 2000);
    },

    setWildColor(c) { this.state.color = c; document.getElementById('colorPicker').classList.add('hidden'); this.nextTurn(); },
    notify(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), 2000); },
    copyId() { navigator.clipboard.writeText(this.state.myId); this.notify("ID COPIATO!"); },
    goTo(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
};
