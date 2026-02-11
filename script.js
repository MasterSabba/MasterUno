const game = {
    state: {
        players: [], deck: [], discard: null, turn: 0, dir: 1, stack: 0,
        color: "", pendingWild: false, selected: [],
        config: { players: 4, rule0: true, rule7: true, strascico: false, multi: true }
    },

    // --- SISTEMA UI ---
    view(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    toast(msg) {
        const layer = document.getElementById('toast-layer');
        const t = document.createElement('div');
        t.className = 'toast'; t.innerText = msg;
        layer.appendChild(t);
        setTimeout(() => t.remove(), 2500);
    },

    handleLogin() {
        const nick = document.getElementById('nickInput').value || "PLAYER";
        const pass = document.getElementById('passInput').value;
        if(pass.length < 3) return this.toast("Password non valida!");
        document.getElementById('helloUser').innerText = "BENVENUTO, " + nick.toUpperCase();
        this.view('menuScreen');
    },

    // --- LOGICA GIOCO ---
    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const types = ['0','1','2','3','4','5','6','7','8','9','SKIP','REV','+2'];
        this.state.deck = [];
        colors.forEach(c => types.forEach(t => this.state.deck.push({c, v:t})));
        for(let i=0; i<4; i++) {
            this.state.deck.push({c:'wild', v:'WILD'});
            this.state.deck.push({c:'wild', v:'+4'});
        }
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    start() {
        this.state.config.players = parseInt(document.getElementById('cfgPlayers').value);
        this.state.config.rule0 = document.getElementById('cfgRule0').checked;
        this.state.config.rule7 = document.getElementById('cfgRule7').checked;
        this.state.config.strascico = document.getElementById('cfgStrascico').checked;
        this.state.config.multi = document.getElementById('cfgMulti').checked;

        this.initDeck();
        this.state.players = [{ name: document.getElementById('nickInput').value || "TU", hand: this.draw(7), bot: false }];
        for(let i=1; i < this.state.config.players; i++) {
            this.state.players.push({ name: "BOT "+i, hand: this.draw(7), bot: true });
        }

        this.state.discard = this.state.deck.find(c => c.c !== 'wild');
        this.state.color = this.state.discard.c;
        this.state.turn = 0;
        this.state.stack = 0;
        this.view('gameArea');
        this.render();
    },

    draw(n) {
        let cards = [];
        for(let i=0; i<n; i++) {
            if(this.state.deck.length === 0) this.initDeck();
            cards.push(this.state.deck.pop());
        }
        return cards;
    },

    render() {
        const p = this.state.players[this.state.turn];
        document.getElementById('activePlayer').innerText = p.name;
        document.getElementById('stackBadge').innerText = this.state.stack > 0 ? "+" + this.state.stack : "";
        document.getElementById('discard-pile').innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;

        // Render Bots
        for(let i=1; i<=3; i++) {
            const slot = document.getElementById('opp-'+i);
            slot.innerHTML = "";
            if(this.state.players[i]) {
                const b = this.state.players[i];
                slot.className = `opp-box ${this.getSide(i)} ${this.state.turn === i ? 'active' : ''}`;
                slot.innerHTML = `${b.name}<br>🎴 ${b.hand.length}`;
            }
        }

        // Render Mia Mano
        const hand = document.getElementById('myHand');
        hand.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const el = document.createElement('div');
            el.className = `card ${c.c} ${this.state.selected.includes(i) ? 'selected' : ''}`;
            el.innerText = c.v;
            el.onclick = () => this.onCardClick(i);
            hand.appendChild(el);
        });
    },

    getSide(i) { return i === 1 ? 'left' : (i === 2 ? 'top' : 'right'); },

    onCardClick(idx) {
        if(this.state.turn !== 0 || this.state.pendingWild) return;
        const card = this.state.players[0].hand[idx];

        if(this.state.config.multi) {
            if(this.state.selected.includes(idx)) {
                this.state.selected = this.state.selected.filter(i => i !== idx);
            } else {
                if(this.state.selected.length > 0 && this.state.players[0].hand[this.state.selected[0]].v !== card.v) {
                    this.state.selected = [idx];
                } else {
                    this.state.selected.push(idx);
                }
            }
            document.getElementById('multiBtn').classList.toggle('hidden', this.state.selected.length === 0);
        } else {
            this.play([idx]);
        }
    },

    playMulti() {
        this.play(this.state.selected);
        this.state.selected = [];
        document.getElementById('multiBtn').classList.add('hidden');
    },

    play(indices) {
        const first = this.state.players[0].hand[indices[0]];
        if(!this.isLegal(first)) return this.toast("Mossa non valida!");

        indices.sort((a,b) => b-a).forEach(i => {
            this.state.discard = this.state.players[0].hand.splice(i, 1)[0];
        });

        this.apply(this.state.discard);
        if(!this.state.pendingWild) this.next();
        this.render();
    },

    isLegal(c) {
        if(this.state.stack > 0) return c.v === '+2' || c.v === '+4';
        return c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild';
    },

    apply(c) {
        if(c.v === '+2') this.state.stack += 2;
        if(c.v === '+4') this.state.stack += 4;
        if(c.v === 'SKIP') this.skip();
        if(c.v === 'REV') this.state.dir *= -1;
        if(c.v === '0' && this.state.config.rule0) this.swap0();
        if(c.v === '7' && this.state.config.rule7) this.swap7();
        if(c.c === 'wild') {
            this.state.pendingWild = true;
            document.getElementById('wildOverlay').style.display = 'flex';
        } else {
            this.state.color = c.c;
        }
    },

    setWild(col) {
        this.state.color = col;
        this.state.pendingWild = false;
        document.getElementById('wildOverlay').style.display = 'none';
        this.next();
        this.render();
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        if(this.state.stack > 0) {
            p.hand.push(...this.draw(this.state.stack));
            this.state.stack = 0;
            this.next();
        } else {
            p.hand.push(...this.draw(1));
            if(!this.state.config.strascico) this.next();
        }
        this.render();
    },

    next() {
        if(this.state.players[this.state.turn].hand.length === 0) {
            alert(this.state.players[this.state.turn].name + " VINCE!");
            return location.reload();
        }
        this.state.turn = (this.state.turn + this.state.dir + this.state.players.length) % this.state.players.length;
        this.render();
        if(this.state.players[this.state.turn].bot) setTimeout(() => this.bot(), 1500);
    },

    bot() {
        const b = this.state.players[this.state.turn];
        let idx = this.state.stack > 0 ? 
            b.hand.findIndex(c => c.v === '+2' || c.v === '+4') : 
            b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');

        if(idx !== -1) {
            const c = b.hand.splice(idx, 1)[0];
            this.state.discard = c;
            this.state.color = c.c === 'wild' ? ['red','blue','green','yellow'][Math.floor(Math.random()*4)] : c.c;
            this.apply(c);
        } else {
            if(this.state.stack > 0) { b.hand.push(...this.draw(this.state.stack)); this.state.stack = 0; }
            else { b.hand.push(...this.draw(1)); }
        }
        this.next();
    },

    swap0() {
        const hands = this.state.players.map(p => p.hand);
        hands.push(hands.shift());
        this.state.players.forEach((p, i) => p.hand = hands[i]);
        this.toast("MANI SCAMBIATE!");
    },

    swap7() {
        // In un bot game, scambia con l'ultimo giocatore
        const target = this.state.players.length - 1;
        const temp = this.state.players[this.state.turn].hand;
        this.state.players[this.state.turn].hand = this.state.players[target].hand;
        this.state.players[target].hand = temp;
        this.toast("SCAMBIO 7!");
    },

    skip() { this.state.turn = (this.state.turn + this.state.dir + this.state.players.length) % this.state.players.length; },
    toggleChat() { document.getElementById('emojiGrid').classList.toggle('hidden'); },
    emoji(e) { this.toast(this.state.players[0].name + ": " + e); this.toggleChat(); }
};
