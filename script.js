const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0, 
        rule07: false, botCount: 3
    },

    login() {
        const val = document.getElementById('nickInput').value.trim();
        if(val.length < 2) return this.notify("Nome troppo corto!");
        this.state.nick = val;
        document.getElementById('welcomeText').innerText = "Ciao, " + val;
        document.getElementById('myPeerIdDisplay').innerText = val.toUpperCase();
        this.goTo('menuScreen');
    },

    notify(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 2000);
    },

    copyId() {
        navigator.clipboard.writeText(document.getElementById('myPeerIdDisplay').innerText);
        this.notify("ID Copiato!");
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    saveSettings() {
        this.state.botCount = parseInt(document.getElementById('botSelect').value);
        this.state.rule07 = document.getElementById('rule07Check').checked;
        this.notify("Impostazioni Salvate!");
        this.goTo('menuScreen');
    },

    startGame() {
        this.state.players = [{ name: this.state.nick, hand: [], bot: false }];
        for(let i=1; i <= this.state.botCount; i++) {
            this.state.players.push({ name: 'Bot '+i, hand: [], bot: true });
        }
        this.initGame();
    },

    initGame() {
        this.createDeck();
        this.state.players.forEach(p => p.hand = this.draw(7));
        this.state.discard = this.state.deck.pop();
        while(this.state.discard.c === 'wild') this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c;
        this.state.turn = 0;
        this.state.dir = 1;
        this.state.stack = 0;
        this.goTo('gameArea');
        this.render();
    },

    createDeck() {
        const cols = ['red', 'blue', 'green', 'yellow'];
        const vals = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
        this.state.deck = [];
        cols.forEach(c => vals.forEach(v => {
            this.state.deck.push({c, v}); this.state.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'W'});
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    draw(n) {
        let cards = [];
        for(let i=0; i<n; i++) {
            if(this.state.deck.length === 0) this.createDeck();
            cards.push(this.state.deck.pop());
        }
        return cards;
    },

    render() {
        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}">${this.getSym(this.state.discard.v)}</div>`;
        
        const slots = ['playerTop', 'playerLeft', 'playerRight'];
        let sIdx = 0;
        
        // Reset slot Bot
        slots.forEach(s => document.getElementById(s).innerHTML = "");

        this.state.players.forEach((p, i) => {
            if(i === 0) return;
            const el = document.getElementById(slots[sIdx++]);
            if(!el) return;
            el.innerHTML = `
                <div class="bot-badge">${p.name} - ${p.hand.length} Carte</div>
                <div class="card card-back"><div class="card-logo">MASTER<span>UNO</span></div></div>
            `;
            el.style.opacity = (this.state.turn === i) ? "1" : "0.6";
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
        if(this.state.stack > 0 && card.v !== 'draw2') return this.notify("Devi rispondere al +2!");
        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            this.state.players[0].hand.splice(idx, 1);
            this.processMove(card);
        }
    },

    processMove(card) {
        this.state.discard = card;
        this.state.color = card.c;
        if(card.v === 'draw2') this.state.stack += 2;
        if(card.v === 'reverse') this.state.dir *= -1;

        if(this.state.rule07) {
            if(card.v === '0') this.rule0();
            if(card.v === '7') this.rule7();
        }

        if(this.state.players[this.state.turn].hand.length === 0) {
            document.getElementById('winMessage').innerText = this.state.players[this.state.turn].bot ? "VINCE " + this.state.players[this.state.turn].name : "HAI VINTO!";
            return this.goTo('winScreen');
        }

        if(card.c === 'wild') document.getElementById('colorPicker').classList.remove('hidden');
        else this.nextTurn(card.v === 'skip');
    },

    nextTurn(skip) {
        const n = this.state.players.length;
        this.state.turn = (this.state.turn + (skip?2:1)*this.state.dir + n) % n;
        
        if(this.state.stack > 0) {
            const p = this.state.players[this.state.turn];
            if(!p.hand.some(c => c.v === 'draw2')) {
                p.hand.push(...this.draw(this.state.stack));
                this.notify(p.name + " pesca " + this.state.stack + "!");
                this.state.stack = 0;
                return this.nextTurn();
            }
        }
        this.render();
        if(this.state.players[this.state.turn].bot) setTimeout(() => this.botTurn(), 1200);
    },

    botTurn() {
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

    rule0() {
        const hands = this.state.players.map(p => p.hand);
        if(this.state.dir === 1) hands.unshift(hands.pop()); else hands.push(hands.shift());
        this.state.players.forEach((p, i) => p.hand = hands[i]);
        this.notify("Mani Scambiate!");
    },

    rule7() {
        let h0 = this.state.players[0].hand;
        this.state.players[0].hand = this.state.players[1].hand;
        this.state.players[1].hand = h0;
        this.notify("Scambio con Bot 1!");
    },

    getSym: (v) => (v==='draw2'?'+2':v==='skip'?'🚫':v==='reverse'?'🔄':v==='W'?'🎨':v),
    setWildColor(c) { this.state.color = c; document.getElementById('colorPicker').classList.add('hidden'); this.nextTurn(); }
};
