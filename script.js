const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0,
        settings: { limit: 4, drawUntil: true, rule07: true }
    },

    login() {
        const val = document.getElementById('nickInput').value.trim();
        if(val.length < 2) return;
        this.state.nick = val;
        this.state.myId = val.toUpperCase().slice(0,3) + Math.floor(100 + Math.random()*899);
        document.getElementById('myId').innerText = this.state.myId;
        document.getElementById('welcomeText').innerText = "CIAO, " + val.toUpperCase();
        
        this.peer = new Peer(this.state.myId);
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
        this.goTo('gameArea');
        this.render();
    },

    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const vals = ['0','1','2','3','4','5','6','7','8','9','Ø','⇄','+2'];
        this.state.deck = [];
        colors.forEach(c => vals.forEach(v => {
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

    async animateDraw(playerIdx) {
        const deckEl = document.getElementById('deck');
        const deckPos = deckEl.getBoundingClientRect();
        
        const card = document.createElement('div');
        card.className = "card card-back flying-card";
        card.innerHTML = `<div class="master-back">MASTER<span>UNO</span></div>`;
        card.style.left = deckPos.left + "px";
        card.style.top = deckPos.top + "px";
        document.body.appendChild(card);

        // Destinazione
        let targetId = "myHand";
        if(playerIdx === 1) targetId = "bot-left";
        if(playerIdx === 2) targetId = "bot-top";
        if(playerIdx === 3) targetId = "bot-right";
        const targetPos = document.getElementById(targetId).getBoundingClientRect();

        await new Promise(r => setTimeout(r, 50));
        card.style.left = (targetPos.left + 20) + "px";
        card.style.top = (targetPos.top + 20) + "px";
        card.style.transform = "rotate(360deg) scale(0.5)";
        card.style.opacity = "0";

        setTimeout(() => card.remove(), 600);
    },

    render() {
        const slots = ['bot-left', 'bot-top', 'bot-right'];
        slots.forEach(s => {
            const el = document.getElementById(s);
            el.innerHTML = ""; el.classList.remove('active-turn');
        });

        const mapping = this.state.settings.limit == 2 ? [{id:'bot-top', idx:1}] :
                      this.state.settings.limit == 3 ? [{id:'bot-left', idx:1}, {id:'bot-right', idx:2}] :
                      [{id:'bot-left', idx:1}, {id:'bot-top', idx:2}, {id:'bot-right', idx:3}];

        mapping.forEach(m => {
            const p = this.state.players[m.idx];
            const el = document.getElementById(m.id);
            if(this.state.turn === m.idx) el.classList.add('active-turn');
            let h = `<div class="badge">${p.name}: ${p.hand.length}</div><div style="display:flex; margin-top:10px">`;
            p.hand.forEach((_, i) => h += `<div class="card card-back" style="margin-left:-65px"><div class="master-back">MASTER<span>UNO</span></div></div>`);
            el.innerHTML = h + "</div>";
        });

        const handEl = document.getElementById('myHand');
        handEl.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const d = document.createElement('div');
            d.className = `card ${c.c}`;
            d.setAttribute('data-val', c.v);
            d.innerText = c.v;
            d.onclick = () => this.playCard(i);
            handEl.appendChild(d);
        });

        document.getElementById('myBadge').innerText = `TU: ${this.state.players[0].hand.length}`;
        const area = document.querySelector('.player-area');
        this.state.turn === 0 ? area.classList.add('active-turn') : area.classList.remove('active-turn');

        document.getElementById('discard-pile').innerHTML = `<div class="card ${this.state.color}" data-val="${this.state.discard.v}">${this.state.discard.v}</div>`;
        document.getElementById('turnIndicator').innerText = "TURNO: " + this.state.players[this.state.turn].name;
    },

    async userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        
        if(this.state.stack > 0) {
            for(let i=0; i<this.state.stack; i++) {
                await this.animateDraw(0);
                p.hand.push(this.draw(1)[0]);
            }
            this.state.stack = 0;
            this.nextTurn();
        } else {
            let drawn;
            do {
                await this.animateDraw(0);
                drawn = this.draw(1)[0];
                p.hand.push(drawn);
                this.render();
                if(!this.state.settings.drawUntil) break;
            } while(!(drawn.c === this.state.color || drawn.v === this.state.discard.v || drawn.c === 'wild'));
            
            setTimeout(() => this.nextTurn(), 800);
        }
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const c = this.state.players[0].hand[i];
        if(this.state.stack > 0 && c.v !== '+2' && c.v !== '+4') return;
        if(c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild') {
            this.state.players[0].hand.splice(i, 1);
            this.handleMove(c);
        }
    },

    handleMove(c) {
        this.state.discard = c;
        if(c.v === '+2') this.state.stack += 2;
        if(c.v === '+4') this.state.stack += 4;
        if(c.v === '⇄') this.state.dir *= -1;
        if(c.c !== 'wild') this.state.color = c.c;

        if(c.c === 'wild') {
            document.getElementById('colorPicker').classList.remove('hidden');
        } else {
            this.nextTurn(c.v === 'Ø');
        }
    },

    nextTurn(skip) {
        const n = this.state.players.length;
        this.state.turn = (this.state.turn + (skip ? 2 : 1) * this.state.dir + n) % n;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1500);
    },

    async botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        
        if(this.state.stack > 0) {
            const sIdx = b.hand.findIndex(c => c.v === '+2' || c.v === '+4');
            if(sIdx !== -1) this.handleMove(b.hand.splice(sIdx, 1)[0]);
            else {
                for(let i=0; i<this.state.stack; i++) {
                    await this.animateDraw(this.state.turn);
                    b.hand.push(this.draw(1)[0]);
                }
                this.state.stack = 0; this.nextTurn();
            }
        } else if(idx !== -1) {
            this.handleMove(b.hand.splice(idx, 1)[0]);
        } else {
            await this.animateDraw(this.state.turn);
            b.hand.push(this.draw(1)[0]);
            this.nextTurn();
        }
    },

    sendEmoji(e) {
        const b = document.getElementById('myEmoji');
        b.innerText = e; b.classList.remove('hidden');
        setTimeout(() => b.classList.add('hidden'), 2000);
    },

    setWildColor(c) {
        this.state.color = c;
        document.getElementById('colorPicker').classList.add('hidden');
        this.nextTurn();
    },

    goTo(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); },
    notify(m) { const t=document.getElementById('toast'); t.innerText=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2000); }
};
