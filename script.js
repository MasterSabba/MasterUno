const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0,
        settings: { limit: 4, drawUntil: true, rule07: true }
    },

    login() {
        const n = document.getElementById('nickInput').value.trim();
        if(n.length < 2) return;
        this.state.nick = n;
        document.getElementById('welcomeText').innerText = "CIAO " + n.toUpperCase();
        this.goTo('menuScreen');
    },

    startGame() {
        this.state.settings.limit = parseInt(document.getElementById('playerLimit').value);
        this.state.settings.drawUntil = document.getElementById('drawUntilPlay').checked;
        
        this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        for(let i=1; i < this.state.settings.limit; i++) {
            this.state.players.push({ name: 'BOT ' + i, hand: [], isBot: true });
        }

        this.initDeck();
        this.state.players.forEach(p => p.hand = this.draw(7));
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        this.state.turn = 0;
        this.state.stack = 0;

        this.goTo('gameArea');
        this.render();
    },

    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const values = ['0','1','2','3','4','5','6','7','8','9','Ø','⇄','+2'];
        this.state.deck = [];
        colors.forEach(c => values.forEach(v => {
            this.state.deck.push({c, v});
            if(v !== '0') this.state.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) {
            this.state.deck.push({c:'wild', v:'🎨'});
            this.state.deck.push({c:'wild', v:'+4'});
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

    render() {
        // Reset bot slot
        ['bot-left', 'bot-top', 'bot-right'].forEach(id => document.getElementById(id).innerHTML = "");

        let mapping = this.state.settings.limit == 2 ? [{id:'bot-top', idx:1}] :
                      this.state.settings.limit == 3 ? [{id:'bot-left', idx:1}, {id:'bot-right', idx:2}] :
                      [{id:'bot-left', idx:1}, {id:'bot-top', idx:2}, {id:'bot-right', idx:3}];

        mapping.forEach(m => {
            const p = this.state.players[m.idx];
            const slot = document.getElementById(m.id);
            if(this.state.turn === m.idx) slot.classList.add('active-turn');
            else slot.classList.remove('active-turn');
            
            let html = `<div class="status-badge">${p.name}: ${p.hand.length}</div><div style="display:flex">`;
            p.hand.forEach((_, i) => {
                html += `<div class="card card-back" style="margin-left:${i===0?0:-60}px"><div class="master-back">MASTER<span>UNO</span></div></div>`;
            });
            slot.innerHTML = html + "</div>";
        });

        // Mia Mano
        const handEl = document.getElementById('myHand');
        handEl.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = `card ${c.c}`;
            div.setAttribute('data-val', c.v);
            div.innerText = c.v;
            div.onclick = () => this.playCard(i);
            handEl.appendChild(div);
        });
        document.getElementById('myBadge').innerText = `TU: ${this.state.players[0].hand.length}`;

        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}" data-val="${this.state.discard.v}">${this.state.discard.v}</div>`;
        document.getElementById('turnIndicator').innerText = this.state.turn === 0 ? "TOCCA A TE" : "TURNO DI " + this.state.players[this.state.turn].name;
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const card = this.state.players[0].hand[i];
        
        // Verifica +2 / +4 accumulati
        if(this.state.stack > 0) {
            if(card.v !== '+2' && card.v !== '+4') return this.notify("Devi rispondere al "+"!");
        }

        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            this.state.players[0].hand.splice(i, 1);
            this.handleEffect(card);
        }
    },

    handleEffect(card) {
        this.state.discard = card;
        if(card.v === '+2') this.state.stack += 2;
        if(card.v === '+4') this.state.stack += 4;
        if(card.v === '⇄') this.state.dir *= -1;
        
        if(card.c !== 'wild') this.state.color = card.c;

        if(card.c === 'wild') {
            if(this.state.turn === 0) {
                document.getElementById('colorPicker').classList.remove('hidden');
            } else {
                this.state.color = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
                this.nextTurn(card.v === 'Ø');
            }
        } else {
            this.nextTurn(card.v === 'Ø');
        }
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        
        if(this.state.stack > 0) {
            p.hand.push(...this.draw(this.state.stack));
            this.state.stack = 0;
            this.nextTurn();
        } else {
            let drawn;
            if(this.state.settings.drawUntil) {
                do {
                    drawn = this.draw(1)[0];
                    p.hand.push(drawn);
                } while(!(drawn.c === this.state.color || drawn.v === this.state.discard.v || drawn.c === 'wild'));
            } else {
                p.hand.push(...this.draw(1));
            }
            this.render();
            setTimeout(() => this.nextTurn(), 1000);
        }
    },

    nextTurn(skip) {
        const n = this.state.players.length;
        this.state.turn = (this.state.turn + (skip ? 2 : 1) * this.state.dir + n) % n;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1500);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        
        if(this.state.stack > 0) {
            const sIdx = b.hand.findIndex(c => c.v === '+2' || c.v === '+4');
            if(sIdx !== -1) {
                const card = b.hand.splice(sIdx, 1)[0];
                this.handleEffect(card);
            } else {
                b.hand.push(...this.draw(this.state.stack));
                this.state.stack = 0;
                this.nextTurn();
            }
        } else if(idx !== -1) {
            const card = b.hand.splice(idx, 1)[0];
            this.handleEffect(card);
        } else {
            b.hand.push(...this.draw(1));
            this.nextTurn();
        }
    },

    setWildColor(c) {
        this.state.color = c;
        document.getElementById('colorPicker').classList.add('hidden');
        this.nextTurn(this.state.discard.v === 'Ø');
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
