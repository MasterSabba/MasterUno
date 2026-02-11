const game = {
    players: [],
    deck: [],
    discard: null,
    turn: 0,
    dir: 1,
    stack: 0,
    currentColor: "",
    selectedIndices: [],
    isMultiplayer: false,
    gameActive: false,
    myIndex: 0,

    // --- SISTEMA LOGIN & SETUP ---
    doLogin() {
        const nick = document.getElementById('nickInput').value;
        if(!nick) return this.toast("Inserisci un Nickname!");
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        this.toast("Bentornato " + nick);
    },

    toggleSettings() {
        document.getElementById('settingsPanel').classList.toggle('hidden');
    },

    toast(msg) {
        const container = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerText = msg;
        container.appendChild(t);
        setTimeout(() => t.remove(), 2500);
    },

    // --- LOGICA MAZZO E REGOLE ---
    createDeck() {
        this.deck = [];
        const colors = ["red", "blue", "green", "yellow"];
        const vals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
        colors.forEach(c => {
            vals.forEach(v => {
                this.deck.push({c, v});
                if(v !== "0") this.deck.push({c, v});
            });
        });
        for(let i=0; i<4; i++) {
            this.deck.push({c: "wild", v: "W"});
            this.deck.push({c: "wild", v: "draw4"});
        }
        this.deck.sort(() => Math.random() - 0.5);
    },

    startLocal() {
        this.createDeck();
        const num = parseInt(document.getElementById('maxPlayers').value);
        this.players = [];
        // Aggiungi Te
        this.players.push({ name: document.getElementById('nickInput').value, hand: this.draw(7), isBot: false });
        // Aggiungi Bot
        for(let i=1; i<num; i++) {
            this.players.push({ name: "BOT " + i, hand: this.draw(7), isBot: true });
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

    draw(n) {
        let res = [];
        for(let i=0; i<n; i++) {
            if(this.deck.length === 0) this.createDeck();
            res.push(this.deck.pop());
        }
        return res;
    },

    // --- GESTIONE TURNO E MOSSE ---
    onCardClick(idx) {
        if(this.turn !== 0 || !this.gameActive) return;
        const card = this.players[0].hand[idx];
        
        if(document.getElementById('ruleMulti').checked) {
            // Logica Selezione Multipla
            if(this.selectedIndices.includes(idx)) {
                this.selectedIndices = this.selectedIndices.filter(i => i !== idx);
            } else {
                if(this.selectedIndices.length > 0) {
                    const first = this.players[0].hand[this.selectedIndices[0]];
                    if(first.v !== card.v) return this.toast("Devono avere lo stesso numero!");
                }
                this.selectedIndices.push(idx);
            }
            document.getElementById('multiControls').classList.toggle('hidden', this.selectedIndices.length === 0);
            this.render();
        } else {
            this.tryPlay([idx]);
        }
    },

    playCombo() {
        this.tryPlay(this.selectedIndices);
        this.selectedIndices = [];
        document.getElementById('multiControls').classList.add('hidden');
    },

    tryPlay(indices) {
        const firstCard = this.players[0].hand[indices[0]];
        if(this.isValid(firstCard)) {
            indices.sort((a,b) => b-a).forEach(i => {
                this.discard = this.players[0].hand.splice(i, 1)[0];
            });
            this.applyEffect(this.discard);
            if(this.discard.c === "wild") {
                document.getElementById('colorPicker').classList.remove('hidden');
            } else {
                this.endTurn();
            }
        } else {
            this.toast("Mossa non valida!");
        }
    },

    isValid(card) {
        if(this.stack > 0) return (card.v === "draw2" || card.v === "draw4");
        return card.c === this.currentColor || card.v === this.discard.v || card.c === "wild";
    },

    applyEffect(card) {
        if(card.v === "draw2") this.stack += 2;
        if(card.v === "draw4") this.stack += 4;
        if(card.v === "skip") this.skipTurn();
        if(card.v === "reverse") this.dir *= -1;
        
        // Regola 0: Scambio mani tra tutti
        if(card.v === "0" && document.getElementById('rule07').checked) {
            this.toast("REGOLA 0: SCAMBIO TOTALE!");
            const hands = this.players.map(p => p.hand);
            hands.push(hands.shift());
            this.players.forEach((p, i) => p.hand = hands[i]);
        }
    },

    endTurn() {
        if(this.players[this.turn].hand.length === 0) {
            this.gameActive = false;
            confetti({ particleCount: 150 });
            alert("VINCE " + this.players[this.turn].name);
            location.reload();
            return;
        }
        this.turn = (this.turn + this.dir + this.players.length) % this.players.length;
        this.render();
        if(this.players[this.turn].isBot) setTimeout(() => this.botBrain(), 1200);
    },

    botBrain() {
        const bot = this.players[this.turn];
        let idx = bot.hand.findIndex(c => this.isValid(c));
        
        if(idx !== -1) {
            const card = bot.hand.splice(idx, 1)[0];
            this.discard = card;
            this.applyEffect(card);
            this.currentColor = (card.c === "wild") ? ["red","blue","green","yellow"][Math.floor(Math.random()*4)] : card.c;
            this.endTurn();
        } else {
            if(this.stack > 0) {
                bot.hand.push(...this.draw(this.stack));
                this.stack = 0;
            } else {
                bot.hand.push(...this.draw(1));
            }
            this.endTurn();
        }
    },

    // --- UTILS ---
    render() {
        document.getElementById('turnIndicator').innerText = "TURNO: " + this.players[this.turn].name;
        document.getElementById('stackBadge').innerText = this.stack > 0 ? "+" + this.stack : "";
        
        // Discard
        const disc = document.getElementById('discardPile');
        disc.innerHTML = `<div class="card ${this.currentColor}">${this.discard.v}</div>`;

        // Player Hand
        const handDiv = document.getElementById('playerHand');
        handDiv.innerHTML = "";
        this.players[0].hand.forEach((c, i) => {
            const d = document.createElement('div');
            d.className = `card ${c.c} ${this.selectedIndices.includes(i) ? 'selected' : ''}`;
            d.innerText = c.v;
            d.onclick = () => this.onCardClick(i);
            handDiv.appendChild(d);
        });

        // Bots
        ["top", "left", "right"].forEach((pos, i) => {
            const slot = document.getElementById('opp-' + pos);
            const pIdx = i + 1;
            if(this.players[pIdx]) {
                slot.innerHTML = `<div>${this.players[pIdx].name}</div><div class="card-back-classic">${this.players[pIdx].hand.length}</div>`;
                slot.style.opacity = (this.turn === pIdx) ? "1" : "0.5";
            }
        });
    },

    userDraw() {
        if(this.turn !== 0) return;
        if(this.stack > 0) {
            this.players[0].hand.push(...this.draw(this.stack));
            this.stack = 0;
        } else {
            this.players[0].hand.push(...this.draw(1));
        }
        this.endTurn();
    },

    setWild(c) {
        this.currentColor = c;
        document.getElementById('colorPicker').classList.add('hidden');
        this.endTurn();
    }
};

// Listener Mazzo
document.getElementById('deck').onclick = () => game.userDraw();
