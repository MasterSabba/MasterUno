const game = {
    players: [], turn: 0, dir: 1, deck: [], discard: null,
    stack: 0, currentColor: "", gameActive: false,
    selectedCards: [], hasSaidUno: false,

    init() {
        document.getElementById('playBotBtn').onclick = () => this.start(false);
        document.getElementById('deck').onclick = () => this.playerDraw();
    },

    toast(m) {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div'); t.className = 'toast'; t.innerText = m;
        c.appendChild(t); setTimeout(() => t.remove(), 2500);
    },

    createDeck() {
        const colors = ["red", "blue", "green", "yellow"];
        const vals = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
        this.deck = [];
        colors.forEach(c => vals.forEach(v => {
            this.deck.push({c, v}); if(v !== "0") this.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) {
            this.deck.push({c: "wild", v: "W"});
            this.deck.push({c: "wild", v: "draw4"});
        }
        this.deck.sort(() => Math.random() - 0.5);
    },

    start(multi) {
        this.createDeck();
        const num = parseInt(document.getElementById('numPlayers').value);
        this.players = [];
        const myName = document.getElementById('playerNameInput').value || "PLAYER 1";
        
        this.players.push({ name: myName, hand: this.drawCards(7), bot: false });
        for(let i=1; i<num; i++) {
            this.players.push({ name: "BOT " + i, hand: this.drawCards(7), bot: true });
        }

        this.discard = this.deck.pop();
        while(this.discard.c === "wild") this.discard = this.deck.pop();
        this.currentColor = this.discard.c;
        this.gameActive = true;
        this.turn = 0;
        
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameArea').classList.remove('hidden');
        this.render();
    },

    drawCards(n) {
        let res = [];
        for(let i=0; i<n; i++) {
            if(this.deck.length === 0) this.createDeck();
            res.push(this.deck.pop());
        }
        return res;
    },

    isValid(card) {
        if(this.stack > 0) return card.v === "draw2" || card.v === "draw4";
        return card.c === this.currentColor || card.v === this.discard.v || card.c === "wild";
    },

    handleCardClick(idx) {
        if(this.turn !== 0 || !this.gameActive) return;
        const card = this.players[0].hand[idx];

        if(this.selectedCards.includes(idx)) {
            this.selectedCards = this.selectedCards.filter(i => i !== idx);
        } else {
            if(this.selectedCards.length > 0) {
                const first = this.players[0].hand[this.selectedCards[0]];
                if(first.v !== card.v) this.selectedCards = [];
            }
            this.selectedCards.push(idx);
        }
        
        document.getElementById('multiActions').classList.toggle('hidden', this.selectedCards.length < 2);
        
        if(this.selectedCards.length === 1 && this.isValid(card)) {
            setTimeout(() => { if(this.selectedCards.length === 1) this.play(this.selectedCards); }, 300);
        }
        this.render();
    },

    playSelectedCombo() {
        if(this.isValid(this.players[0].hand[this.selectedCards[0]])) {
            this.play(this.selectedCards);
        } else {
            this.toast("Mossa non valida!");
            this.selectedCards = [];
            this.render();
        }
    },

    play(indices) {
        indices.sort((a,b) => b-a).forEach(i => {
            this.discard = this.players[0].hand.splice(i, 1)[0];
        });
        
        this.applyEffect(this.discard);
        this.selectedCards = [];
        document.getElementById('multiActions').classList.add('hidden');

        if(this.discard.c === "wild") {
            document.getElementById('colorPicker').classList.remove('hidden');
        } else {
            this.currentColor = this.discard.c;
            this.next();
        }
    },

    applyEffect(card) {
        if(card.v === "draw2") this.stack += 2;
        if(card.v === "draw4") this.stack += 4;
        if(card.v === "reverse") this.dir *= -1;
        if(card.v === "skip") this.turn = (this.turn + this.dir + this.players.length) % this.players.length;
        
        const rule = document.getElementById('swapRule').value;
        if(card.v === "0" && (rule === "0" || rule === "both")) this.rule0();
    },

    rule0() {
        this.toast("REGOLA 0: SCAMBIO TOTALE!");
        const hands = this.players.map(p => p.hand);
        if(this.dir === 1) hands.push(hands.shift());
        else hands.unshift(hands.pop());
        this.players.forEach((p, i) => p.hand = hands[i]);
    },

    playerDraw() {
        if(this.turn !== 0) return;
        if(this.stack > 0) {
            this.players[0].hand.push(...this.drawCards(this.stack));
            this.stack = 0;
        } else {
            this.players[0].hand.push(...this.drawCards(1));
        }
        this.next();
    },

    next() {
        if(this.players[this.turn].hand.length === 0) {
            this.gameActive = false;
            document.getElementById('endScreen').classList.remove('hidden');
            document.getElementById('endTitle').innerText = this.turn === 0 ? "HAI VINTO!" : "HAI PERSO!";
            if(this.turn === 0) confetti();
            return;
        }
        this.turn = (this.turn + this.dir + this.players.length) % this.players.length;
        this.render();
        if(this.players[this.turn].bot) setTimeout(() => this.botPlay(), 1200);
    },

    botPlay() {
        const bot = this.players[this.turn];
        let idx = bot.hand.findIndex(c => this.isValid(c));
        if(idx !== -1) {
            this.discard = bot.hand.splice(idx, 1)[0];
            this.applyEffect(this.discard);
            this.currentColor = this.discard.c === "wild" ? colors[Math.floor(Math.random()*4)] : this.discard.c;
            this.next();
        } else {
            if(this.stack > 0) {
                bot.hand.push(...this.drawCards(this.stack));
                this.stack = 0;
            } else bot.hand.push(...this.drawCards(1));
            this.next();
        }
    },

    setWildColor(c) {
        this.currentColor = c;
        document.getElementById('colorPicker').classList.add('hidden');
        this.next();
    },

    render() {
        document.getElementById('turnIndicator').innerText = "TURNO DI: " + this.players[this.turn].name;
        document.getElementById('stackBadge').innerText = this.stack > 0 ? "+" + this.stack : "";
        
        const oppArea = document.getElementById('opponentsArea');
        oppArea.innerHTML = "";
        this.players.forEach((p, i) => {
            if(i === 0) {
                const hand = document.getElementById('playerHand');
                hand.innerHTML = "";
                p.hand.forEach((c, ci) => {
                    const d = document.createElement('div');
                    d.className = `card ${c.c} ${this.selectedCards.includes(ci) ? 'selected' : ''}`;
                    d.innerText = c.v.replace("draw", "+").replace("W", "🎨");
                    d.onclick = () => this.handleCardClick(ci);
                    hand.appendChild(d);
                });
                document.getElementById('playerBadge').innerText = "TU: " + p.hand.length;
            } else {
                const b = document.createElement('div');
                b.className = `opp-box ${this.turn === i ? 'active' : ''}`;
                b.innerHTML = `<div>${p.name}</div><div class="card-back-classic">${p.hand.length}</div>`;
                oppArea.appendChild(b);
            }
        });

        const disc = document.getElementById('discardPile');
        disc.innerHTML = `<div class="card ${this.currentColor}">${this.discard.v.replace("draw", "+")}</div>`;
    }
};

game.init();
