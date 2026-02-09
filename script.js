const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0, dir: 1, stack: 0,
        settings: { drawUntil: true, bots: 2 }
    },

    // 1. Gestione Login e Schermate
    doLogin() {
        const n = document.getElementById('nickInput').value.trim();
        if(!n) return alert("Inserisci un nome!");
        this.state.nick = n;
        this.state.myId = n.toUpperCase().slice(0,3) + Math.floor(100 + Math.random()*899);
        document.getElementById('displayId').innerText = this.state.myId;
        document.getElementById('menuUserTitle').innerText = "CIAO " + n.toUpperCase();
        this.goTo('menuScreen');
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    // 2. Logica Gioco
    startGame() {
        this.state.settings.drawUntil = document.getElementById('drawUntil').checked;
        this.state.settings.bots = parseInt(document.getElementById('botCount').value);
        
        this.state.players = [{ name: this.state.nick, hand: [], isBot: false }];
        for(let i=1; i <= this.state.settings.bots; i++) {
            this.state.players.push({ name: "BOT " + i, hand: [], isBot: true });
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
        const deckPos = document.getElementById('deck').getBoundingClientRect();
        const card = document.createElement('div');
        card.className = "card card-back flying-card";
        card.innerHTML = `<div class="master-back">MASTER<span>UNO</span></div>`;
        card.style.left = deckPos.left + "px";
        card.style.top = deckPos.top + "px";
        document.body.appendChild(card);

        let targetId = "myHand";
        if(playerIdx === 1) targetId = "bot-left";
        if(playerIdx === 2) targetId = "bot-top";
        if(playerIdx === 3) targetId = "bot-right";
        
        const target = document.getElementById(targetId).getBoundingClientRect();
        await new Promise(r => setTimeout(r, 20));
        card.style.left = target.left + "px";
        card.style.top = target.top + "px";
        card.style.opacity = "0";
        setTimeout(() => card.remove(), 500);
    },

    render() {
        // Controllo Vittoria
        this.state.players.forEach(p => {
            if(p.hand.length === 0) return this.showVictory(p.name);
        });

        // Pulizia slot bot
        ['bot-left', 'bot-top', 'bot-right'].forEach(s => document.getElementById(s).innerHTML = "");
        
        const mapping = this.state.settings.bots == 1 ? [{id:'bot-top', idx:1}] :
                        this.state.settings.bots == 2 ? [{id:'bot-left', idx:1}, {id:'bot-right', idx:2}] :
                        [{id:'bot-left', idx:1}, {id:'bot-top', idx:2}, {id:'bot-right', idx:3}];

        mapping.forEach(m => {
            const el = document.getElementById(m.id);
            const p = this.state.players[m.idx];
            el.className = `player-slot ${m.id.split('-')[1]} ${this.state.turn === m.idx ? 'active-turn' : ''}`;
            let h = `<div class="status-badge">${p.name}: ${p.hand.length}</div><div style="display:flex">`;
            p.hand.forEach((_, i) => { if(i < 8) h += `<div class="card card-back" style="margin-left:-60px"></div>`; });
            el.innerHTML = h + "</div>";
        });

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
        
        if(this.state.stack > 0) {
            for(let i=0; i<this.state.stack; i++) { await this.animateDraw(0); p.hand.push(this.draw(1)[0]); }
            this.state.stack = 0; this.nextTurn();
        } else {
            let drawn;
            // PESCA A STRASCICO LOGIC
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
        if(c.c === 'wild') document.getElementById('colorPicker').classList.remove('hidden');
        else this.nextTurn(c.v === 'Ø');
    },

    nextTurn(skip) {
        const n = this.state.players.length;
        this.state.turn = (this.state.turn + (skip ? 2 : 1) * this.state.dir + n) % n;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1200);
    },

    async botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        
        if(this.state.stack > 0) {
            const sIdx = b.hand.findIndex(v => v.v === '+2' || v.v === '+4');
            if(sIdx !== -1) this.handleMove(b.hand.splice(sIdx,1)[0]);
            else {
                for(let i=0; i<this.state.stack; i++) { await this.animateDraw(this.state.turn); b.hand.push(this.draw(1)[0]); }
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

    showVictory(name) {
        this.goTo('winScreen');
        document.getElementById('winStatus').innerText = (name === this.state.nick) ? "HAI VINTO!" : "HAI PERSO!";
        document.getElementById('winMessage').innerText = name + " ha finito le carte!";
    },

    setWildColor(c) { this.state.color = c; document.getElementById('colorPicker').classList.add('hidden'); this.nextTurn(); },
    copyId() { navigator.clipboard.writeText(this.state.myId); document.getElementById('toast').classList.remove('hidden'); setTimeout(()=>document.getElementById('toast').classList.add('hidden'), 2000); }
};
