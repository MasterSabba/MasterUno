const game = {
    state: {
        players: [], deck: [], discard: null, turn: 0, dir: 1, stack: 0,
        selected: [], color: "", pendingWild: false,
        settings: { n: 4, rule07: true, multi: true, stack: true }
    },

    // Notifiche (Toast)
    notify(msg) {
        const container = document.getElementById('alert-container');
        const t = document.createElement('div');
        t.className = 'toast'; t.innerText = msg;
        container.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2000);
    },

    doLogin() {
        const nick = document.getElementById('nickInput').value || "PLAYER";
        document.getElementById('userDisplay').innerText = "BENVENUTO " + nick.toUpperCase();
        this.goTo('menuScreen');
        this.notify("Accesso autorizzato");
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    toggleSettings() {
        const s = document.getElementById('settingsOverlay');
        s.style.display = s.style.display === 'flex' ? 'none' : 'flex';
    },

    // GIOCO
    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const values = ['0','1','2','3','4','5','6','7','8','9','SKIP','REV','+2'];
        this.state.deck = [];
        colors.forEach(c => values.forEach(v => this.state.deck.push({c, v})));
        for(let i=0; i<4; i++) {
            this.state.deck.push({c:'wild', v:'+4'});
            this.state.deck.push({c:'wild', v:'WILD'});
        }
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    startGame() {
        this.state.settings.n = parseInt(document.getElementById('setPlayers').value);
        this.state.settings.rule07 = document.getElementById('set07').checked;
        this.state.settings.multi = document.getElementById('setMulti').checked;
        this.state.settings.stack = document.getElementById('setStack').checked;

        this.initDeck();
        this.state.players = [{ name: "TU", hand: this.draw(7), isBot: false }];
        for(let i=1; i<this.state.settings.n; i++) {
            this.state.players.push({ name: "BOT "+i, hand: this.draw(7), isBot: true });
        }
        
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        this.state.turn = 0;
        this.goTo('gameArea');
        this.render();
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
        const cur = this.state.players[this.state.turn];
        document.querySelector('#turnTag span').innerText = cur.name;
        document.getElementById('stackValue').innerText = this.state.stack > 0 ? "+" + this.state.stack : "";
        document.getElementById('discard-pile').innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;

        // Bots
        [1,2,3].forEach(i => {
            const slot = document.getElementById('slot-'+i);
            slot.innerHTML = "";
            if(this.state.players[i]) {
                const b = this.state.players[i];
                slot.className = `bot-box ${this.getPos(i)} ${this.state.turn === i ? 'active' : ''}`;
                slot.innerHTML = `<b>${b.name}</b><br>Carte: ${b.hand.length}`;
            }
        });

        // Player Hand
        const hand = document.getElementById('myHand');
        hand.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const d = document.createElement('div');
            d.className = `card ${c.c} ${this.state.selected.includes(i) ? 'selected' : ''}`;
            d.innerText = c.v;
            d.onclick = () => this.handleCardClick(i);
            hand.appendChild(d);
        });
    },

    getPos(i) { return i === 1 ? 'left' : (i === 2 ? 'top' : 'right'); },

    handleCardClick(idx) {
        if(this.state.turn !== 0) return;
        const card = this.state.players[0].hand[idx];

        if(this.state.settings.multi) {
            if(this.state.selected.includes(idx)) {
                this.state.selected = this.state.selected.filter(i => i !== idx);
            } else {
                if(this.state.selected.length > 0 && this.state.players[0].hand[this.state.selected[0]].v !== card.v) {
                    this.state.selected = [idx]; // Cambia selezione se diverso
                } else {
                    this.state.selected.push(idx);
                }
            }
            document.getElementById('multiPlayBtn').classList.toggle('hidden', this.state.selected.length === 0);
        } else {
            this.executePlay([idx]);
        }
    },

    confirmMulti() {
        this.executePlay(this.state.selected);
        this.state.selected = [];
        document.getElementById('multiPlayBtn').classList.add('hidden');
    },

    executePlay(indices) {
        const first = this.state.players[0].hand[indices[0]];
        if(!this.isValid(first)) return this.notify("Mossa non valida!");

        indices.sort((a,b) => b-a).forEach(i => {
            this.state.discard = this.state.players[0].hand.splice(i, 1)[0];
        });

        this.applyLogic(this.state.discard);
        if(!this.state.pendingWild) this.nextTurn();
        this.render();
    },

    isValid(c) {
        if(this.state.stack > 0) return c.v === '+2' || c.v === '+4';
        return c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild';
    },

    applyLogic(c) {
        if(c.v === '+2') this.state.stack += 2;
        if(c.v === '+4') this.state.stack += 4;
        if(c.v === 'SKIP') this.state.turn = (this.state.turn + this.state.dir + this.state.players.length) % this.state.players.length;
        if(c.v === 'REV') this.state.dir *= -1;
        if(this.state.settings.rule07 && c.v === '0') this.swapHands();
        if(c.c === 'wild') {
            this.state.pendingWild = true;
            document.getElementById('wildPicker').style.display = 'flex';
        }
    },

    pickColor(col) {
        this.state.color = col;
        this.state.pendingWild = false;
        document.getElementById('wildPicker').style.display = 'none';
        this.nextTurn();
        this.render();
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        if(this.state.stack > 0) {
            p.hand.push(...this.draw(this.state.stack));
            this.state.stack = 0;
            this.notify("Hai pescato le carte accumulate!");
        } else {
            p.hand.push(...this.draw(1));
        }
        this.nextTurn();
        this.render();
    },

    nextTurn() {
        this.state.turn = (this.state.turn + this.state.dir + this.state.players.length) % this.state.players.length;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1500);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        let idx = this.state.stack > 0 ? b.hand.findIndex(c => c.v === '+2' || c.v === '+4') : b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');

        if(idx !== -1) {
            const c = b.hand.splice(idx, 1)[0];
            this.state.discard = c;
            this.state.color = c.c === 'wild' ? ['red','blue','green','yellow'][Math.floor(Math.random()*4)] : c.c;
            this.applyLogic(c);
        } else {
            if(this.state.stack > 0) { b.hand.push(...this.draw(this.state.stack)); this.state.stack = 0; }
            else { b.hand.push(...this.draw(1)); }
        }
        this.nextTurn();
        this.render();
    },

    toggleEmoji() { document.getElementById('emojiBar').classList.toggle('hidden'); },
    sendEmoji(e) { this.notify("TU: " + e); this.toggleEmoji(); }
};
