const game = {
    state: {
        nick: "", players: [], deck: [], discard: null,
        color: "", turn: 0,
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    doLogin() {
        const input = document.getElementById('nickInput').value;
        this.state.nick = input || "GIOCATORE";
        document.getElementById('welcomeText').innerText = `CIAO, ${this.state.nick.toUpperCase()}`;
        document.getElementById('playerNameDisplay').innerText = this.state.nick;
        this.goTo('menuScreen');
    },

    startGame() {
        this.initDeck();
        this.state.players = [
            { name: this.state.nick, hand: this.draw(7), isBot: false },
            { name: "AI DUSTY", hand: this.draw(7), isBot: true },
            { name: "AI LUNA", hand: this.draw(7), isBot: true },
            { name: "AI PUDDING", hand: this.draw(7), isBot: true }
        ];
        
        let firstCard;
        do { firstCard = this.state.deck.pop(); } while(firstCard.c === 'wild');
        
        this.state.discard = firstCard;
        this.state.color = firstCard.c;
        this.state.turn = 0;
        
        this.goTo('gameArea');
        this.render();
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

    render() {
        document.getElementById('turnIndicator').innerText = `TURNO DI: ${this.state.players[this.state.turn].name}`;
        document.getElementById('discard-pile').innerHTML = `<div class="card ${this.state.color}">${this.state.discard.v}</div>`;

        // Mano Giocatore
        const hand = document.getElementById('myHand');
        hand.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const div = document.createElement('div');
            div.className = `card ${c.c}`;
            div.innerText = c.v;
            div.onclick = () => this.playCard(i);
            hand.appendChild(div);
        });
        document.getElementById('cardCount').innerText = this.state.players[0].hand.length;

        // Bot
        this.renderBot('bot-left', 1);
        this.renderBot('bot-top', 2);
        this.renderBot('bot-right', 3);

        // Controllo vittoria
        this.state.players.forEach(p => {
            if(p.hand.length === 0) {
                alert(p.name + " VINCE!");
                this.goTo('menuScreen');
            }
        });
    },

    renderBot(id, idx) {
        const container = document.getElementById(id);
        container.innerHTML = "";
        this.state.players[idx].hand.forEach(() => {
            const c = document.createElement('div');
            c.className = "card card-back";
            c.innerHTML = `<span class="m-text">MASTER</span><span class="u-text">UNO</span>`;
            c.style.marginLeft = "-65px";
            container.appendChild(c);
        });
    },

    playCard(i) {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        const card = p.hand[i];
        if(card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild') {
            p.hand.splice(i, 1);
            this.state.discard = card;
            this.state.color = card.c === 'wild' ? 'blue' : card.c;
            this.render();
            this.nextTurn();
        }
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        this.state.players[0].hand.push(this.draw(1)[0]);
        this.render();
        setTimeout(() => this.nextTurn(), 800);
    },

    nextTurn() {
        this.state.turn = (this.state.turn + 1) % 4;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1200);
    },

    botPlay() {
        const b = this.state.players[this.state.turn];
        const idx = b.hand.findIndex(c => c.c === this.state.color || c.v === this.state.discard.v || c.c === 'wild');
        if(idx !== -1) {
            const c = b.hand.splice(idx, 1)[0];
            this.state.discard = c;
            this.state.color = c.c === 'wild' ? 'red' : c.c;
        } else {
            b.hand.push(this.draw(1)[0]);
        }
        this.render();
        this.nextTurn();
    }
};
