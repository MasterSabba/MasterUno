const game = {
    state: {
        players: [], deck: [], discard: null, turn: 0, dir: 1, stack: 0,
        selected: [], color: "", pendingWild: false
    },

    // Notifiche automatiche
    notify(msg) {
        const area = document.getElementById('notification-area');
        const t = document.createElement('div');
        t.className = 'toast'; t.innerText = msg;
        area.appendChild(t);
        setTimeout(() => t.remove(), 2500);
    },

    doLogin() {
        const n = document.getElementById('nickInput').value || "PLAYER-1";
        const p = document.getElementById('passInput').value;
        if(p.length < 4) return this.notify("Password troppo corta!");
        document.getElementById('userHello').innerText = "BENVENUTO " + n;
        this.goTo('menuScreen');
    },

    // Logica Carte
    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const values = ['0','1','2','3','4','5','6','7','8','9','SKIP','REV','+2'];
        this.state.deck = [];
        colors.forEach(c => values.forEach(v => this.state.deck.push({c, v})));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'+4'}, {c:'wild', v:'WILD'});
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    startGame() {
        const nPlayers = parseInt(document.getElementById('setPlayers').value);
        this.initDeck();
        this.state.players = [{ name: "TU", hand: this.draw(7), isBot: false }];
        for(let i=1; i<nPlayers; i++) this.state.players.push({ name: "BOT "+i, hand: this.draw(7), isBot: true });
        
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        this.goTo('gameArea');
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

    // Gestione Turni & Bug +2/+4
    playCard(index) {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        const card = p.hand[index];

        // Regola Combo (Multi)
        if(document.getElementById('setMulti').checked) {
            this.handleMultiSelect(index);
        } else {
            this.executePlay([index]);
        }
    },

    handleMultiSelect(idx) {
        if(this.state.selected.includes(idx)) {
            this.state.selected = this.state.selected.filter(i => i !== idx);
        } else {
            const firstIdx = this.state.selected[0];
            if(this.state.selected.length > 0 && this.state.players[0].hand[firstIdx].v !== this.state.players[0].hand[idx].v) {
                return this.notify("Devono avere lo stesso numero!");
            }
            this.state.selected.push(idx);
        }
        this.render();
        document.getElementById('confirmBtn').classList.toggle('hidden', this.state.selected.length === 0);
    },

    confirmMulti() {
        this.executePlay(this.state.selected);
        this.state.selected = [];
        document.getElementById('confirmBtn').classList.add('hidden');
    },

    executePlay(indices) {
        const p = this.state.players[0];
        const firstCard = p.hand[indices[0]];

        if(this.isValid(firstCard)) {
            indices.sort((a,b) => b-a).forEach(i => {
                this.state.discard = p.hand.splice(i, 1)[0];
            });
            this.applyEffects(this.state.discard);
            this.render();
            if(!this.state.pendingWild) this.nextTurn();
        } else {
            this.notify("Mossa non valida!");
        }
    },

    isValid(c) {
        if(this.state.stack > 0) return c.v === '+2' || c.v === '+4';
        return c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild';
    },

    applyEffects(c) {
        if(c.v === '+2') this.state.stack += 2;
        if(c.v === '+4') this.state.stack += 4;
        if(c.v === 'SKIP') this.skipNext();
        if(c.v === 'REV') this.state.dir *= -1;
        if(c.v === '0' && document.getElementById('set07').checked) this.swapAll();
    },

    nextTurn() {
        this.state.turn = (this.state.turn + this.state.dir + this.state.players.length) % this.state.players.length;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1500);
    },

    // Chat
    sendEmoji(e) {
        this.notify("TU: " + e);
        document.getElementById('emojiBox').style.display = 'none';
    },

    // Rendering con animazione "illuminata"
    render() {
        const current = this.state.players[this.state.turn];
        document.getElementById('activePlayer').innerText = current.name;
        document.getElementById('stackAlert').innerText = this.state.stack > 0 ? "+" + this.state.stack : "";
        
        // Discard
        const disc = document.getElementById('discard-area');
        disc.innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;

        // Bots
        [1,2,3].forEach(i => {
            const slot = document.getElementById('bot-'+(i === 1 ? 'left' : (i === 2 ? 'top' : 'right')));
            slot.innerHTML = "";
            if(this.state.players[i]) {
                const b = this.state.players[i];
                slot.className = `player-slot ${i === 1 ? 'side' : (i === 2 ? 'top' : 'side')} ${this.state.turn === i ? 'active-turn' : ''}`;
                slot.innerHTML = `<b>${b.name}</b> (${b.hand.length})`;
            }
        });

        // Hand
        const hand = document.getElementById('myHand');
        hand.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = `card ${c.c} ${this.state.selected.includes(i) ? 'selected' : ''}`;
            div.innerText = c.v;
            div.onclick = () => this.playCard(i);
            hand.appendChild(div);
        });
    }
};
