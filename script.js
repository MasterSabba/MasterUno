const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0,
        settings: { drawUntil: true }
    },

    goTo(id) {
        // Nasconde tutte le schermate e attiva solo quella richiesta
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    doLogin() {
        const n = document.getElementById('nickInput').value;
        this.state.nick = n || "Player";
        document.getElementById('menuUserTitle').innerText = "CIAO " + this.state.nick;
        this.goTo('menuScreen');
    },

    startGame() {
        this.state.settings.drawUntil = document.getElementById('drawUntil').checked;
        this.state.players = [
            { name: this.state.nick, hand: [], isBot: false },
            { name: "Bot 1", hand: [], isBot: true },
            { name: "Bot 2", hand: [], isBot: true }
        ];
        this.initDeck();
        this.state.players.forEach(p => p.hand = this.draw(7));
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        this.state.turn = 0;
        this.goTo('gameArea');
        this.render();
    },

    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const vals = ['0','1','2','3','4','5','6','7','8','9','+2'];
        this.state.deck = [];
        colors.forEach(c => vals.forEach(v => this.state.deck.push({c, v})));
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
        // Controllo vittoria
        this.state.players.forEach(p => {
            if(p.hand.length === 0) {
                document.getElementById('winMessage').innerText = p.name + " ha vinto!";
                this.goTo('winScreen');
            }
        });

        // Slot Bot
        const mapping = [{id:'bot-left', idx:1}, {id:'bot-top', idx:2}];
        mapping.forEach(m => {
            const el = document.getElementById(m.id);
            const p = this.state.players[m.idx];
            let h = `<div class="status-badge">${p.name}: ${p.hand.length}</div><div style="display:flex">`;
            p.hand.forEach(() => h += `<div class="card card-back" style="margin-left:-55px"></div>`);
            el.innerHTML = h + "</div>";
        });

        // Mia Mano
        const handEl = document.getElementById('myHand');
        handEl.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const d = document.createElement('div');
            d.className = `card ${c.c}`; d.innerText = c.v;
            d.onclick = () => this.playCard(i);
            handEl.appendChild(d);
        });

        document.getElementById('myBadge').innerText = `TU: ${this.state.players[0].hand.length}`;
        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;
        document.getElementById('turnIndicator').innerText = "TURNO: " + this.state.players[this.state.turn].name;
    },

    async userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        let drawn;
        
        // Logica Pesca a strascico
        do {
            drawn = this.draw(1)[0];
            p.hand.push(drawn);
            this.render();
            if(!this.state.settings.drawUntil) break;
        } while(!(drawn.c === this.state.color || drawn.v === this.state.discard.v || drawn.c === 'wild'));
        
        setTimeout(() => this.nextTurn(), 1000);
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        const c = p.hand[i];
        if(c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild') {
            p.hand.splice(i, 1);
            this.state.discard = c;
            this.state.color = c.c === 'wild' ? 'red' : c.c;
            this.render();
            this.nextTurn();
        }
    },

    nextTurn() {
        this.state.turn = (this.state.turn + 1) % this.state.players.length;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1200);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        if(idx !== -1) {
            const c = b.hand.splice(idx, 1)[0];
            this.state.discard = c;
            this.state.color = c.c === 'wild' ? 'blue' : c.c;
            this.nextTurn();
        } else {
            b.hand.push(this.draw(1)[0]);
            this.nextTurn();
        }
    }
};
