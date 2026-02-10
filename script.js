const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, stack: 0, pendingWild: false,
        settings: { numPlayers: 4, rule07: true }
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    copyCode() {
        const c = Math.random().toString(36).substring(7).toUpperCase();
        document.getElementById('joinCode').value = c;
        alert("Codice Partita Copiato!");
    },

    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const vals = ['0','1','2','3','4','5','6','7','8','9','+2'];
        this.state.deck = [];
        for(let i=0; i<2; i++){
            colors.forEach(c => vals.forEach(v => this.state.deck.push({c, v})));
            for(let j=0; j<4; j++) this.state.deck.push({c:'wild', v:'+4'});
        }
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

    startGame() {
        this.state.settings.numPlayers = parseInt(document.getElementById('playerCount').value);
        this.state.settings.rule07 = document.getElementById('rule07').checked;
        this.initDeck();
        this.state.players = [{ name: "TU", hand: this.draw(7), isBot: false }];
        for(let i=1; i < this.state.settings.numPlayers; i++) {
            this.state.players.push({ name: "BOT "+i, hand: this.draw(7), isBot: true });
        }
        this.state.discard = this.state.deck.find(c => c.c !== 'wild');
        this.state.color = this.state.discard.c;
        this.state.stack = 0;
        this.state.turn = 0;
        this.goTo('gameArea');
        this.render();
    },

    render() {
        document.getElementById('turnIndicator').innerText = "TURNO: " + this.state.players[this.state.turn].name;
        document.getElementById('stackInfo').innerText = this.state.stack > 0 ? "ATTENZIONE: +" + this.state.stack : "";
        document.getElementById('discard-area').innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;

        // Render Bot Slots
        ['bot-left', 'bot-top', 'bot-right'].forEach(id => document.getElementById(id).innerHTML = "");
        this.state.players.forEach((p, i) => {
            if(i === 0) return;
            let slotId = i === 1 ? 'bot-left' : (i === 2 ? 'bot-top' : 'bot-right');
            let h = `<div style="background:var(--gold); color:black; padding:2px 10px; border-radius:10px; font-weight:bold; font-size:12px; margin-bottom:5px">${p.name} (${p.hand.length})</div><div style="display:flex">`;
            p.hand.forEach(() => h += `<div class="card card-back" style="margin-left:-55px; width:60px; height:90px"></div>`);
            document.getElementById(slotId).innerHTML = h + "</div>";
        });

        // Mia Mano
        const hand = document.getElementById('myHand');
        hand.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const d = document.createElement('div');
            d.className = `card ${c.c}`; d.innerText = c.v;
            d.onclick = () => this.playCard(i);
            hand.appendChild(d);
        });
        document.getElementById('myBadge').innerText = "TU: " + this.state.players[0].hand.length;

        if(this.state.players[this.state.turn].hand.length === 0) {
            alert(this.state.players[this.state.turn].name + " HA VINTO!");
            location.reload();
        }
    },

    playCard(i) {
        if(this.state.turn !== 0 || this.state.pendingWild) return;
        const p = this.state.players[0];
        const c = p.hand[i];

        if(this.state.stack > 0 && c.v !== '+2' && c.v !== '+4') return;

        if(c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild') {
            p.hand.splice(i, 1);
            this.state.discard = c;
            
            if(c.v === '+2') this.state.stack += 2;
            if(c.v === '+4') this.state.stack += 4;

            if(c.c === 'wild') {
                this.state.pendingWild = true;
                document.getElementById('colorPicker').style.display = 'flex';
            } else {
                this.state.color = c.c;
                this.checkSpecialRules(c);
                this.nextTurn();
            }
            this.render();
        }
    },

    selectColor(color) {
        this.state.color = color;
        this.state.pendingWild = false;
        document.getElementById('colorPicker').style.display = 'none';
        this.render();
        this.nextTurn();
    },

    checkSpecialRules(c) {
        if(this.state.settings.rule07 && c.v === '0') {
            let hands = this.state.players.map(p => p.hand);
            hands.push(hands.shift());
            this.state.players.forEach((p, i) => p.hand = hands[i]);
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

    nextTurn() {
        this.state.turn = (this.state.turn + 1) % this.state.players.length;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1200);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        let idx = this.state.stack > 0 ? b.hand.findIndex(c => c.v === '+2' || c.v === '+4') : b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');

        if(idx !== -1) {
            const c = b.hand.splice(idx, 1)[0];
            this.state.discard = c;
            this.state.color = c.c === 'wild' ? ['red','blue','green','yellow'][Math.floor(Math.random()*4)] : c.c;
            if(c.v === '+2') this.state.stack += 2;
            if(c.v === '+4') this.state.stack += 4;
            this.checkSpecialRules(c);
        } else {
            if(this.state.stack > 0) { b.hand.push(...this.draw(this.state.stack)); this.state.stack = 0; }
            else { b.hand.push(this.draw(1)[0]); }
        }
        this.render();
        this.nextTurn();
    }
};
