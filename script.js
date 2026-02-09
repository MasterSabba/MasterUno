const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0,
        settings: { limit: 4, rule07: true },
        lastDrawnValid: false // Per la regola della pesca singola
    },

    login() {
        const n = document.getElementById('nickInput').value.trim();
        if(n.length < 2) return;
        this.state.nick = n;
        document.getElementById('welcomeText').innerText = "BENVENUTO " + n.toUpperCase();
        this.goTo('menuScreen');
    },

    startGame() {
        this.state.settings.limit = parseInt(document.getElementById('playerLimit').value);
        this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        for(let i=1; i < this.state.settings.limit; i++) {
            this.state.players.push({ name: 'BOT ' + i, hand: [], isBot: true });
        }
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
        const botIds = ['bot-left', 'bot-top', 'bot-right'];
        botIds.forEach(id => document.getElementById(id).innerHTML = "");

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
                html += `<div class="card card-back" style="margin-left:${i===0?0:-65}px"><div class="master-back">MASTER<span>UNO</span></div></div>`;
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
        const mySlot = document.querySelector('.player-bottom');
        this.state.turn === 0 ? mySlot.classList.add('active-turn') : mySlot.classList.remove('active-turn');

        document.getElementById('discard').innerHTML = `<div class="card ${this.state.color}" data-val="${this.state.discard.v}">${this.state.discard.v}</div>`;
        document.getElementById('turnIndicator').innerText = this.state.turn === 0 ? "TOCCA A TE" : "TURNO DI " + this.state.players[this.state.turn].name;
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        const card = p.hand[i];
        
        // Se hai appena pescato, puoi giocare SOLO la carta pescata (se è quella)
        if(this.state.lastDrawnValid && i !== p.hand.length - 1) {
            return this.notify("Puoi giocare solo la carta appena pescata!");
        }

        if(this.state.stack > 0 && card.v !== '+2' && card.v !== '+4') return;

        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            p.hand.splice(i, 1);
            this.handleEffect(card);
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
            // REGOLA ORIGINALE: Pesca 1 sola carta
            const card = this.draw(1)[0];
            p.hand.push(card);
            this.render();

            // È giocabile subito?
            if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
                this.state.lastDrawnValid = true;
                this.notify("Giocabile! Clicca la carta per calarla o attendi.");
                // Se non la gioca entro 3 secondi, passa
                setTimeout(() => { if(this.state.lastDrawnValid) this.nextTurn(); }, 3000);
            } else {
                this.notify("Non giocabile. Passi il turno.");
                setTimeout(() => this.nextTurn(), 1200);
            }
        }
    },

    handleEffect(card) {
        this.state.lastDrawnValid = false;
        this.state.discard = card;
        if(card.v === '+2') this.state.stack += 2;
        if(card.v === '+4') this.state.stack += 4;
        if(card.v === '⇄') this.state.dir *= -1;
        if(card.c !== 'wild') this.state.color = card.c;

        if(card.c === 'wild') {
            document.getElementById('colorPicker').classList.remove('hidden');
        } else {
            this.nextTurn(card.v === 'Ø');
        }
    },

    nextTurn(skip) {
        this.state.lastDrawnValid = false;
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
            if(sIdx !== -1) { this.handleEffect(b.hand.splice(sIdx, 1)[0]); } 
            else { b.hand.push(...this.draw(this.state.stack)); this.state.stack = 0; this.nextTurn(); }
        } else if(idx !== -1) {
            this.handleEffect(b.hand.splice(idx, 1)[0]);
        } else {
            // Bot pesca 1 come da regola originale
            const card = this.draw(1)[0];
            if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
                this.handleEffect(card);
            } else {
                b.hand.push(card);
                this.nextTurn();
            }
        }
    },

    sendEmoji(e) {
        const bubble = document.getElementById('myEmoji');
        bubble.innerText = e;
        bubble.classList.remove('hidden');
        setTimeout(() => bubble.classList.add('hidden'), 2000);
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
