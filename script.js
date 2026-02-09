const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, 
        rule07: true, drawUntilPlay: true, limit: 4
    },

    login() {
        const n = document.getElementById('nickInput').value.trim();
        if(n.length < 2) return;
        this.state.nick = n;
        document.getElementById('welcomeText').innerText = "CIAO " + n.toUpperCase();
        this.goTo('menuScreen');
    },

    startGame() {
        this.state.limit = parseInt(document.getElementById('playerLimit').value);
        this.state.rule07 = document.getElementById('rule07').checked;
        this.state.drawUntilPlay = document.getElementById('drawUntilPlay').checked;
        
        this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        for(let i=1; i < this.state.limit; i++) {
            this.state.players.push({ name: 'BOT ' + i, hand: [], isBot: true });
        }

        this.initDeck();
        this.state.players.forEach(p => p.hand = this.draw(7));
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        this.state.turn = 0;
        this.state.dir = 1;

        this.goTo('gameArea');
        this.render();
    },

    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const values = ['0','1','2','3','4','5','6','7','8','9','🚫','🔄','+2'];
        this.state.deck = [];
        colors.forEach(c => values.forEach(v => {
            this.state.deck.push({c, v});
            if(v !== '0') this.state.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'🎨'});
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
        // Reset slot
        document.getElementById('bot-left').innerHTML = "";
        document.getElementById('bot-top').innerHTML = "";
        document.getElementById('bot-right').innerHTML = "";

        // Logica posizionamento disordinata sistemata
        const otherPlayers = this.state.players.slice(1);
        let positions = [];
        if(this.state.limit == 2) positions = ['bot-top'];
        if(this.state.limit == 3) positions = ['bot-left', 'bot-right'];
        if(this.state.limit == 4) positions = ['bot-left', 'bot-top', 'bot-right'];

        otherPlayers.forEach((p, i) => {
            const slot = document.getElementById(positions[i]);
            let handHTML = `<div class="status-badge">${p.name} (${p.hand.length})</div><div class="hand-container">`;
            p.hand.forEach(() => {
                handHTML += `<div class="card card-back opp-card"></div>`;
            });
            handHTML += `</div>`;
            slot.innerHTML = handHTML;
            slot.style.opacity = (this.state.turn === (i+1)) ? "1" : "0.6";
        });

        // Scarto
        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;
        
        // Mia Mano
        const handEl = document.getElementById('myHand');
        handEl.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = `card ${c.c}`;
            div.innerText = c.v;
            div.onclick = () => this.playCard(i);
            handEl.appendChild(div);
        });

        document.getElementById('turnIndicator').innerText = this.state.turn === 0 ? "TOCCA A TE" : "TURNO DI " + this.state.players[this.state.turn].name;
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        const card = p.hand[i];

        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            p.hand.splice(i, 1);
            this.handleCardEffect(card);
        }
    },

    handleCardEffect(card) {
        this.state.discard = card;
        this.state.color = card.c === 'wild' ? this.state.color : card.c;

        if(this.state.rule07) {
            if(card.v === '0') return this.ruleZero();
            if(card.v === '7') return this.ruleSeven();
        }

        if(card.v === '🔄') this.state.dir *= -1;
        if(card.v === '🎨') {
            document.getElementById('colorPicker').classList.remove('hidden');
            return;
        }

        this.nextTurn(card.v === '🚫');
    },

    // REGOLA 0: Tutti passano la mano al successivo
    ruleZero() {
        const hands = this.state.players.map(p => p.hand);
        if(this.state.dir === 1) hands.unshift(hands.pop());
        else hands.push(hands.shift());
        this.state.players.forEach((p, i) => p.hand = hands[i]);
        this.notify("REGOLA 0: MANI SCAMBIATE!");
        this.nextTurn();
    },

    // REGOLA 7: Scegli con chi scambiare
    ruleSeven() {
        if(this.state.turn !== 0) { // Bot sceglie a caso
            let target = Math.floor(Math.random() * this.state.players.length);
            while(target === this.state.turn) target = Math.floor(Math.random() * this.state.players.length);
            this.swapHands(this.state.turn, target);
            this.nextTurn();
        } else {
            const area = document.getElementById('swapTargets');
            area.innerHTML = "";
            this.state.players.forEach((p, i) => {
                if(i === 0) return;
                const b = document.createElement('button');
                b.className = "btn-main";
                b.innerText = p.name;
                b.onclick = () => {
                    this.swapHands(0, i);
                    document.getElementById('swapPicker').classList.add('hidden');
                    this.nextTurn();
                };
                area.appendChild(b);
            });
            document.getElementById('swapPicker').classList.remove('hidden');
        }
    },

    swapHands(i, j) {
        const temp = this.state.players[i].hand;
        this.state.players[i].hand = this.state.players[j].hand;
        this.state.players[j].hand = temp;
        this.notify("SCAMBIO CARTE AVVENUTO!");
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        
        if(this.state.drawUntilPlay) {
            let canPlay = false;
            while(!canPlay) {
                const c = this.draw(1)[0];
                p.hand.push(c);
                if(c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild') canPlay = true;
                this.render();
            }
        } else {
            p.hand.push(...this.draw(1));
            this.nextTurn();
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
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        if(idx !== -1) {
            const card = b.hand.splice(idx, 1)[0];
            if(card.c === 'wild') card.c = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
            this.handleCardEffect(card);
        } else {
            b.hand.push(...this.draw(1));
            this.nextTurn();
        }
    },

    setWildColor(c) {
        this.state.color = c;
        document.getElementById('colorPicker').classList.add('hidden');
        this.nextTurn();
    },

    notify(m) {
        const t = document.getElementById('toast');
        t.innerText = m; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 2000);
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    }
};
