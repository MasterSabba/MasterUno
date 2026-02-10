const game = {
    state: {
        players: [], deck: [], discard: null, turn: 0, 
        stack: 0, dir: 1, 
        settings: { num: 4, rule07: true, strascico: false, multi: true },
        selectedCards: []
    },

    // --- SISTEMA CORE ---
    doLogin() {
        const nick = document.getElementById('nickInput').value || "Player";
        document.getElementById('welcomeMsg').innerText = "CIAO, " + nick.toUpperCase();
        document.getElementById('myNickDisplay').innerText = nick;
        this.goTo('menuScreen');
        this.showToast("Accesso eseguito come " + nick);
    },

    goTo(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    toggleSettings() {
        const el = document.getElementById('settingsOverlay');
        el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
    },

    showToast(msg) {
        const t = document.createElement('div');
        t.className = 'toast'; t.innerText = msg;
        document.getElementById('toast-container').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    },

    // --- LOGICA GIOCO ---
    initDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const vals = ['0','1','2','3','4','5','6','7','8','9','+2','SKIP','REV'];
        this.state.deck = [];
        colors.forEach(c => vals.forEach(v => this.state.deck.push({c, v})));
        for(let i=0; i<4; i++) this.state.deck.push({c:'wild', v:'+4'}, {c:'wild', v:'WILD'});
        this.state.deck.sort(() => Math.random() - 0.5);
    },

    startGame() {
        this.state.settings.num = parseInt(document.getElementById('setPlayers').value);
        this.state.settings.rule07 = document.getElementById('set07').checked;
        this.state.settings.strascico = document.getElementById('setStrascico').checked;
        this.state.settings.multi = document.getElementById('setMulti').checked;
        
        this.initDeck();
        this.state.players = [{ name: "TU", hand: this.draw(7), isBot: false }];
        for(let i=1; i<this.state.settings.num; i++) {
            this.state.players.push({ name: "BOT "+i, hand: this.draw(7), isBot: true });
        }
        
        this.state.discard = this.state.deck.pop();
        this.state.color = this.state.discard.c === 'wild' ? 'red' : this.state.discard.c;
        this.goTo('gameArea');
        this.render();
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
        const p = this.state.players[this.state.turn];
        document.getElementById('turnName').innerText = p.name;
        document.getElementById('stackBadge').innerText = this.state.stack > 0 ? "+"+this.state.stack : "";
        document.getElementById('discard-pile').innerHTML = this.createCardHTML(this.state.discard, false, this.state.color);

        // Render Bot Slots
        for(let i=1; i<=3; i++) {
            const slot = document.getElementById('slot-'+i);
            slot.innerHTML = "";
            if(this.state.players[i]) {
                const bot = this.state.players[i];
                slot.className = `bot-pos ${this.state.turn === i ? 'active-turn' : ''}`;
                slot.innerHTML = `<div>${bot.name} (${bot.hand.length})</div>`;
            }
        }

        // Render My Hand
        const handDiv = document.getElementById('myHand');
        handDiv.innerHTML = "";
        this.state.players[0].hand.forEach((c, i) => {
            const cardEl = document.createElement('div');
            cardEl.innerHTML = this.createCardHTML(c, true);
            const inner = cardEl.firstChild;
            inner.onclick = () => this.handleCardClick(i);
            handDiv.appendChild(inner);
        });
        document.getElementById('myCount').innerText = this.state.players[0].hand.length;
    },

    createCardHTML(card, isSmall, forceColor) {
        const colorClass = forceColor || card.c;
        return `<div class="card ${colorClass} ${isSmall ? 'hand-card' : ''}">
                    ${card.v}
                </div>`;
    },

    handleCardClick(index) {
        if(this.state.turn !== 0) return;
        const card = this.state.players[0].hand[index];
        
        if(this.state.settings.multi) {
            // Logica Selezione Multipla
            const el = document.querySelectorAll('.hand-card')[index];
            if(this.state.selectedCards.includes(index)) {
                this.state.selectedCards = this.state.selectedCards.filter(i => i !== index);
                el.classList.remove('selected');
            } else {
                const firstSelectedIdx = this.state.selectedCards[0];
                if(this.state.selectedCards.length > 0) {
                    const firstCard = this.state.players[0].hand[firstSelectedIdx];
                    if(firstCard.v !== card.v) {
                        this.showToast("Puoi selezionare solo carte dello stesso numero!");
                        return;
                    }
                }
                this.state.selectedCards.push(index);
                el.classList.add('selected');
            }
            document.getElementById('playMultiBtn').classList.toggle('hidden', this.state.selectedCards.length < 1);
        } else {
            this.playSingle(index);
        }
    },

    confirmMultiPlay() {
        const indices = [...this.state.selectedCards].sort((a,b) => b-a);
        const firstCard = this.state.players[0].hand[indices[0]];
        
        if(this.isValidMove(firstCard)) {
            indices.forEach(idx => {
                const c = this.state.players[0].hand.splice(idx, 1)[0];
                this.state.discard = c;
            });
            this.state.selectedCards = [];
            this.applyCardEffect(this.state.discard);
            this.render();
            if(!this.state.pendingWild) this.nextTurn();
        }
        document.getElementById('playMultiBtn').classList.add('hidden');
    },

    isValidMove(card) {
        if(this.state.stack > 0) return card.v === '+2' || card.v === '+4';
        return card.c === this.state.color || card.v === this.state.discard.v || card.c === 'wild';
    },

    userDraw() {
        if(this.state.turn !== 0) return;
        const p = this.state.players[0];
        
        if(this.state.stack > 0) {
            p.hand.push(...this.draw(this.state.stack));
            this.state.stack = 0;
            this.nextTurn();
        } else {
            const newCard = this.draw(1)[0];
            p.hand.push(newCard);
            if(!this.state.settings.strascico) this.nextTurn();
        }
        this.render();
    },

    // --- REGOLE SPECIALI ---
    applyCardEffect(card) {
        if(card.v === '+2') this.state.stack += 2;
        if(card.v === '+4') this.state.stack += 4;
        if(card.v === 'SKIP') this.nextTurn();
        if(card.v === 'REV') this.state.dir *= -1;
        if(this.state.settings.rule07 && card.v === '0') this.rotateHands();
        if(card.c === 'wild') {
            this.state.pendingWild = true;
            document.getElementById('colorPicker').style.display = 'flex';
        }
    },

    rotateHands() {
        const hands = this.state.players.map(p => p.hand);
        if(this.state.dir === 1) hands.push(hands.shift());
        else hands.unshift(hands.pop());
        this.state.players.forEach((p, i) => p.hand = hands[i]);
        this.showToast("MANI SCAMBIATE!");
    },

    nextTurn() {
        this.state.turn = (this.state.turn + this.state.dir + this.state.players.length) % this.state.players.length;
        this.render();
        if(this.state.players[this.state.turn].isBot) setTimeout(() => this.botPlay(), 1500);
    },

    // --- ABBELLIMENTI ---
    toggleEmoji() {
        document.getElementById('emojiPanel').classList.toggle('hidden');
    },
    sendEmoji(e) {
        this.showToast("TU: " + e);
        this.toggleEmoji();
    }
};
