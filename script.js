const app = {
    state: {
        nick: "", players: [], deck: [], hand: [], top: null, 
        color: "", turn: 0, stack: 0, active: false,
        settings: { bots: 3, rule07: false }
    },

    // Navigazione
    screen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    },

    handleLogin() {
        this.state.nick = document.getElementById('nickInput').value || "Giocatore";
        document.getElementById('welcomeText').innerText = "Ciao, " + this.state.nick;
        this.screen('startScreen');
    },

    showSettings() { this.screen('settingsScreen'); },
    
    saveSettings() {
        this.state.settings.bots = parseInt(document.getElementById('botCount').value);
        this.state.settings.rule07 = document.getElementById('rule07Check').checked;
        this.screen('startScreen');
    },

    // Logica Core
    startGame() {
        this.state.active = true;
        this.createDeck();
        this.state.players = [{ n: this.state.nick, h: [], bot: false }];
        for(let i=0; i<this.state.settings.bots; i++) {
            this.state.players.push({ n: "Bot "+(i+1), h: this.draw(7), bot: true });
        }
        this.state.hand = this.draw(7);
        this.state.top = this.state.deck.pop();
        while(this.state.top.c === 'wild') this.state.top = this.state.deck.pop();
        this.state.color = this.state.top.c;
        this.state.turn = 0;
        this.screen('gameArea');
        this.render();
    },

    createDeck() {
        this.state.deck = [];
        const cols = ['red', 'blue', 'green', 'yellow'];
        const vals = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
        cols.forEach(c => vals.forEach(v => {
            this.state.deck.push({c, v}); 
            if(v !== '0') this.state.deck.push({c, v});
        }));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'W'});
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    draw(n) {
        let res = [];
        for(let i=0; i<n; i++) {
            if(this.state.deck.length === 0) this.createDeck();
            res.push(this.state.deck.pop());
        }
        return res;
    },

    getSymbol(v) {
        if(v === 'skip') return '🚫';
        if(v === 'reverse') return '🔄';
        if(v === 'draw2') return '+2';
        return v;
    },

    render() {
        // Scarto
        document.getElementById('discardPile').innerHTML = `
            <div class="card ${this.state.color}" data-symbol="${this.getSymbol(this.state.top.v)}">${this.getSymbol(this.state.top.v)}</div>
        `;
        
        // Bot
        const ops = document.getElementById('otherPlayers');
        ops.innerHTML = "";
        this.state.players.forEach((p, i) => {
            if(i !== 0) ops.innerHTML += `<div class="badge">${p.n}<br>🎴 ${p.h.length}</div>`;
        });

        // Mano Umana
        const hDiv = document.getElementById('playerHand');
        hDiv.innerHTML = "";
        this.state.hand.forEach((c, i) => {
            const d = document.createElement('div');
            d.className = `card ${c.c}`;
            const s = this.getSymbol(c.v);
            d.setAttribute('data-symbol', s);
            d.innerText = s;
            d.onclick = () => this.play(i);
            hDiv.appendChild(d);
        });

        const turnInfo = this.state.players[this.state.turn];
        document.getElementById('turnIndicator').innerText = this.state.turn === 0 ? "🟢 IL TUO TURNO" : "🔴 TURNO DI " + turnInfo.n;
    },

    play(i) {
        if(this.state.turn !== 0) return;
        const card = this.state.hand[i];
        
        if(this.state.stack > 0 && card.v !== 'draw2') return;

        if(card.c === this.state.color || card.v === this.state.top.v || card.c === 'wild') {
            this.state.hand.splice(i, 1);
            this.state.top = card;
            this.state.color = card.c;
            
            if(card.v === 'draw2') this.state.stack += 2;
            
            if(this.state.hand.length === 0) return this.win(this.state.nick);

            if(card.c === 'wild') {
                document.getElementById('colorPicker').classList.remove('hidden');
            } else {
                this.next(card.v === 'skip');
            }
        }
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        this.state.hand.push(...this.draw(this.state.stack || 1));
        this.state.stack = 0;
        this.next();
    },

    next(skip = false) {
        this.state.turn = (this.state.turn + (skip ? 2 : 1)) % this.state.players.length;
        this.render();
        
        let p = this.state.players[this.state.turn];
        if(this.state.stack > 0) {
            let currentHand = p.bot ? p.h : this.state.hand;
            if(!currentHand.some(c => c.v === 'draw2')) {
                currentHand.push(...this.draw(this.state.stack));
                this.state.stack = 0;
                return this.next();
            }
        }

        if(p.bot) setTimeout(() => this.botTurn(), 1200);
    },

    botTurn() {
        let b = this.state.players[this.state.turn];
        let i = b.h.findIndex(c => (this.state.stack > 0 ? c.v === 'draw2' : (c.c === this.state.color || c.v === this.state.top.v || c.c === 'wild')));
        
        if(i !== -1) {
            let card = b.h.splice(i, 1)[0];
            this.state.top = card;
            this.state.color = card.c === 'wild' ? 'red' : card.c;
            if(card.v === 'draw2') this.state.stack += 2;
            if(b.h.length === 0) return this.win(b.n);
            this.next(card.v === 'skip');
        } else {
            b.h.push(...this.draw(this.state.stack || 1));
            this.state.stack = 0;
            this.next();
        }
    },

    setWildColor(c) {
        this.state.color = c;
        document.getElementById('colorPicker').classList.add('hidden');
        this.next();
    },

    win(name) {
        alert("🏆 " + name + " HA VINTO!");
        location.reload();
    },

    toast(m) {
        console.log("Emoji: " + m);
    }
};
