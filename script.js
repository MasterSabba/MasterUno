const game = {

    players: [],
    deck: [],
    discardPile: [],
    turn: 0,
    dir: 1,
    stack: 0,
    currentColor: "",
    gameActive: false,

    init() {
        this.createDeck();
        this.players = [
            { name: "TU", hand: this.draw(7), isBot: false },
            { name: "BOT 1", hand: this.draw(7), isBot: true },
            { name: "BOT 2", hand: this.draw(7), isBot: true },
            { name: "BOT 3", hand: this.draw(7), isBot: true }
        ];

        let first = this.deck.pop();
        while(first.c === "wild") first = this.deck.pop();

        this.discardPile = [first];
        this.currentColor = first.c;
        this.gameActive = true;

        this.render();
    },

    createDeck() {
        this.deck = [];
        const colors = ["red","blue","green","yellow"];
        const values = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];

        colors.forEach(c=>{
            values.forEach(v=>{
                this.deck.push({c,v});
                if(v !== "0") this.deck.push({c,v});
            });
        });

        for(let i=0;i<4;i++){
            this.deck.push({c:"wild",v:"wild"});
            this.deck.push({c:"wild",v:"draw4"});
        }

        this.deck.sort(()=>Math.random()-0.5);
    },

    recycleDeck() {
        const last = this.discardPile.pop();
        this.deck = [...this.discardPile];
        this.discardPile = [last];
        this.deck.sort(()=>Math.random()-0.5);
    },

    draw(n){
        let cards = [];
        for(let i=0;i<n;i++){
            if(this.deck.length === 0) this.recycleDeck();
            cards.push(this.deck.pop());
        }
        return cards;
    },

    isValid(card){
        if(this.stack>0)
            return card.v==="draw2"||card.v==="draw4";

        return card.c===this.currentColor ||
               card.v===this.discardPile.at(-1).v ||
               card.c==="wild";
    },

    playCard(playerIndex, cardIndex){

        const player = this.players[playerIndex];
        const card = player.hand[cardIndex];

        if(!this.isValid(card)) return;

        player.hand.splice(cardIndex,1);
        this.discardPile.push(card);

        this.currentColor = card.c==="wild"
            ? ["red","blue","green","yellow"][Math.floor(Math.random()*4)]
            : card.c;

        this.applyEffect(card);

        if(player.hand.length===0){
            alert("VINCE "+player.name);
            location.reload();
            return;
        }

        this.nextTurn();
    },

    applyEffect(card){

        if(card.v==="draw2") this.stack+=2;
        if(card.v==="draw4") this.stack+=4;

        if(card.v==="reverse"){
            if(this.players.length===2){
                this.nextTurn();
            } else {
                this.dir*=-1;
            }
        }

        if(card.v==="skip"){
            this.nextTurn();
        }
    },

    nextTurn(){

        this.turn=(this.turn+this.dir+this.players.length)%this.players.length;

        if(this.stack>0){
            const p=this.players[this.turn];
            p.hand.push(...this.draw(this.stack));
            this.stack=0;
            this.turn=(this.turn+this.dir+this.players.length)%this.players.length;
        }

        this.render();

        if(this.players[this.turn].isBot)
            setTimeout(()=>this.botMove(),800);
    },

    botMove(){
        const bot=this.players[this.turn];
        let idx=bot.hand.findIndex(c=>this.isValid(c));

        if(idx!==-1){
            this.playCard(this.turn,idx);
        } else {
            bot.hand.push(...this.draw(1));
            this.nextTurn();
        }
    },

    render(){

        document.getElementById("turnIndicator").innerText =
            "TURNO: "+this.players[this.turn].name;

        document.getElementById("stackBadge").innerText =
            this.stack>0? "+"+this.stack:"";

        const discard=this.discardPile.at(-1);
        document.getElementById("discardPile").innerHTML =
            `<div class="card ${this.currentColor}">${discard.v}</div>`;

        const handDiv=document.getElementById("playerHand");
        handDiv.innerHTML="";
        this.players[0].hand.forEach((c,i)=>{
            const d=document.createElement("div");
            d.className=`card ${c.c}`;
            d.innerText=c.v;
            d.onclick=()=>this.playCard(0,i);
            handDiv.appendChild(d);
        });

        ["top","left","right"].forEach((pos,i)=>{
            const slot=document.getElementById("opp-"+pos);
            const p=this.players[i+1];
            if(!p) return;
            slot.innerHTML=
                `<div>${p.name}</div>
                 <div class="card-back">${p.hand.length}</div>`;
        });
    }

};

document.getElementById("deck").onclick=()=> {
    if(game.turn!==0) return;
    game.players[0].hand.push(...game.draw(1));
    game.nextTurn();
};

game.init();
