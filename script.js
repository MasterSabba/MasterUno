const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, stack: 0 // Stack gestisce il +2 e +4
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    doLogin() {
        this.state.nick = document.getElementById('nickInput').value || "PLAYER";
        document.getElementById('menuUserTitle').innerText = "CIAO " + this.state.nick;
        this.goTo('menuScreen');
    },

    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const vals = ['0','1','2','3','4','5','6','7','8','9','+2'];
        this.state.deck = [];
        for(let i=0; i<2; i++) {
            colors.forEach(c => vals.forEach(v => this.state.deck.push({c, v})));
            for(let j=0; j<2; j++) this.state.deck.push({c:'wild', v:'+4'});
        }
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    draw(n) {
        let cards = [];
        for(let i=0; i<n; i++) {
            if(this.state.deck.length === 0) this.initDeck();
            cards.push(this.state.deck.pop());
        }
        return cards;
    },

    startGame() {
        const num = parseInt(document.getElementById('playerCount').value);
        this.initDeck();
        this.state.players = [{ name: this.state.nick, hand: this.draw(7), isBot: false }];
        for(let i=1; i < num; i++) {
            this.state.players.push({ name: "BOT "+i, hand: this.draw(7), isBot: true });
        }
        this.state.discard = this.state.deck.find(c => c.v !== '+4' && c.v !== '+2');
        this.state.color = this.state.discard.c;
        this.state.stack = 0;
        this.state.turn = 0;
        this.goTo('gameArea');
        this.render();
    },

    render() {
        document.getElementById('turnIndicator').innerText = "TURNO DI: " + this.state.players[this.state.turn].name;
        document.getElementById('stackIndicator').innerText = this.state.stack > 0 ? "DA PESCARE: +" + this.state.stack : "";
        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;

        // Reset slot bot
        ['bot-left', 'bot-top', 'bot-right'].forEach(id => document.getElementById(id).innerHTML = "");
        
        // Distribuisci bot negli slot
        this.state.players.forEach((p, i) => {
            if(i === 0) return;
            let slotId = i === 1 ? 'bot-left' : (i === 2 ? 'bot-top' : 'bot-right');
            let h = `<div class="status-badge">${p.name}: ${p.hand.length}</div><div style="display:flex">`;
            p.hand.forEach(() => h += `<div class="card card-back" style="margin-left:-55px"></div>`);
            document.getElementById(slotId).innerHTML = h + "</div>";
        });

        // Mia mano
        const myHand = document.getElementById('myHand');
        myHand.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const d = document.createElement('div');
            d.className = `card ${c.c}`; d.innerText = c.v;
            d.onclick = () => this.playCard(i);
            myHand.appendChild(d);
        });
        document.getElementById('myBadge').innerText = "TU: " + this.state.players[0].hand.length;

        if(this.state.players[this.state.turn].hand.length === 0) {
            alert(this.state.players[this.state.turn].name + " VINCE!");
            location.reload();
        }
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        
        if(this.state.stack > 0) {
            p.hand.push(...this.draw(this.state.stack));
            this.state.stack = 0;
        } else {
            p.hand.push(this.draw(1)[0]);
        }
        this.render();
        setTimeout(() => this.nextTurn(), 1000);
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        const c = p.hand[i];

        // Se c'è uno stack (+2 o +4), puoi giocare solo un altro +2 o +4
        if(this.state.stack > 0 && c.v !== '+2' && c.v !== '+4') return;

        if(c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild') {
            p.hand.splice(i, 1);
            this.state.discard = c;
            this.state.color = c.c === 'wild' ? 'red' : c.c;
            
            if(c.v === '+2') this.state.stack += 2;
            if(c.v === '+4') this.state.stack += 4;

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
        // Se c'è uno stack, il bot cerca un +2 o +4 per rispondere
        let idx = -1;
        if(this.state.stack > 0) {
            idx = b.hand.findIndex(c => c.v === '+2' || c.v === '+4');
        } else {
            idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        }

        if(idx !== -1) {
            const c = b.hand.splice(idx, 1)[0];
            this.state.discard = c;
            this.state.color = c.c === 'wild' ? 'blue' : c.c;
            if(c.v === '+2') this.state.stack += 2;
            if(c.v === '+4') this.state.stack += 4;
        } else {
            if(this.state.stack > 0) {
                b.hand.push(...this.draw(this.state.stack));
                this.state.stack = 0;
            } else {
                b.hand.push(this.draw(1)[0]);
            }
        }
        this.render();
        this.nextTurn();
    }
};
