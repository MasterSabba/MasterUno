const colors = ["red", "blue", "green", "yellow"];
const values = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
let deck = [], players = [], topCard = null, currentColor = "", drawStack = 0;
let currentTurn = 0, gameActive = true, isMultiplayer = false, peer, conn, playerId = 0;

// --- CREAZIONE MAZZO ---
function createDeck() {
    deck = [];
    colors.forEach(c => { 
        values.forEach(v => { 
            deck.push({color: c, value: v});
            if(v !== "0") deck.push({color: c, value: v});
        });
    });
    for(let i=0;i<4;i++){ deck.push({color:"wild",value:"W"}, {color:"wild4",value:"wild4"}); }
    deck.sort(()=>Math.random()-0.5);
}

// --- INIZIALIZZAZIONE GIOCATORI ---
function initPlayers(numPlayers=4) {
    players = [];
    for(let i=0;i<numPlayers;i++){
        players.push({hand:[], isBot:true, name:"BOT "+(i+1)});
    }
    players[playerId].isBot = false; // il giocatore locale
}

// --- DISTRIBUZIONE CARTE ---
function dealCards() {
    for(let i=0;i<7;i++){
        players.forEach(p=>p.hand.push(deck.pop()));
    }
    topCard = deck.pop();
    while(topCard.color.includes("wild")) topCard = deck.pop();
    currentColor = topCard.color;
}

// --- LOGICA TURNO ---
function nextTurn(skip=false) {
    if(skip) currentTurn = (currentTurn + 2) % players.length;
    else currentTurn = (currentTurn + 1) % players.length;
    if(players[currentTurn].isBot && gameActive) setTimeout(botTurn, 1000);
}

// --- VALIDAZIONE MOSSA ---
function isValidMove(card, player) {
    if(drawStack>0){
        if(topCard.value==="draw2") return card.value==="draw2";
        if(topCard.value==="wild4") return card.value==="wild4";
        return false;
    }
    return card.color===currentColor || card.value===topCard.value || card.color.includes("wild");
}

// --- GIOCO CARTA ---
function playCard(playerIndex, cardIndex) {
    const player = players[playerIndex];
    if(playerIndex!==currentTurn || !gameActive) return;
    const card = player.hand[cardIndex];
    if(!isValidMove(card, player)) return;
    
    player.hand.splice(cardIndex,1);
    topCard = card;
    
    if(card.value==="draw2") drawStack+=2;
    if(card.value==="wild4") drawStack+=4;
    
    currentColor = card.color.includes("wild") ? currentColor : card.color;
    
    renderGame();

    // effetto skip/reverse
    let skipTurn = card.value==="skip";
    if(card.value==="reverse" && players.length>2){
        players.reverse();
        currentTurn = players.length-1-currentTurn;
    }

    if(player.hand.length===0){
        gameActive=false;
        showEndScreen(playerIndex===playerId);
        return;
    }
    nextTurn(skipTurn);
    if(isMultiplayer) sendMove();
}

// --- BOT ---
function botTurn() {
    if(!gameActive) return;
    const bot = players[currentTurn];
    let playable = bot.hand.findIndex(c=>isValidMove(c, bot));
    if(playable!==-1){
        playCard(currentTurn, playable);
    } else {
        if(drawStack>0){
            for(let i=0;i<drawStack;i++) if(deck.length>0) bot.hand.push(deck.pop());
            drawStack=0;
        } else if(deck.length>0) bot.hand.push(deck.pop());
        renderGame();
        nextTurn();
    }
}

// --- RENDERING ---
function renderGame() {
    // Aggiorna tutte le mani
    players.forEach((p,i)=>{
        let handDiv = document.getElementById(i===playerId ? "playerHand" : `player${i}Hand`);
        if(!handDiv) return;
        handDiv.innerHTML="";
        p.hand.forEach((c,ci)=>{
            const d = document.createElement("div");
            const v = c.value==="draw2"?"+2":c.value==="wild4"?"+4":c.value==="skip"?"Ø":c.value==="reverse"?"⇄":c.value;
            d.className=`card ${c.color}`; d.innerText=v; d.setAttribute("data-val",v);
            if(i===playerId)d.onclick=()=>playCard(i,ci);
            handDiv.appendChild(d);
        });
        // badge carte
        let badge = document.getElementById(i===playerId?"playerBadge":`player${i}Badge`);
        if(badge) badge.innerText = `${p.name}: ${p.hand.length}`;
    });
    
    // mazzo e scarti
    const discard = document.getElementById("discardPile");
    const vTop = (topCard.value==="draw2"?"+2":topCard.value==="wild4"?"+4":topCard.value==="skip"?"Ø":topCard.value==="reverse"?"⇄":topCard.value);
    discard.innerHTML=`<div class="card ${currentColor}" data-val="${vTop}">${vTop}</div>`;
}

// --- MAZZO ---
document.getElementById("deck").onclick=()=>{
    const player = players[playerId];
    if(currentTurn!==playerId || !gameActive) return;
    if(drawStack>0){
        for(let i=0;i<drawStack;i++) if(deck.length>0) player.hand.push(deck.pop());
        drawStack=0;
    } else if(deck.length>0) player.hand.push(deck.pop());
    renderGame();
    nextTurn();
    if(isMultiplayer) sendMove();
};

// --- MULTIPLAYER PEERJS ---
function initPeer() {
    peer = new Peer(Math.random().toString(36).substr(2,5).toUpperCase());
    peer.on('open',id=>{document.getElementById("myPeerId").innerText=id;});
    peer.on('connection',c=>{conn=c; isMultiplayer=true; setupChat();});
}
initPeer();

function setupChat() {
    conn.on('data',d=>{
        if(d.type==='START'){
            deck=d.deck; players=d.players; topCard=d.top; currentColor=d.color; currentTurn=d.turn; drawStack=d.stack; gameActive=true;
            document.querySelectorAll("#startScreen, #endScreen, #colorPicker").forEach(s=>s.classList.add("hidden"));
            document.getElementById("gameArea").classList.remove("hidden");
            renderGame();
        } else if(d.type==='MOVE'){
            players=d.players; topCard=d.top; currentColor=d.color; drawStack=d.stack; currentTurn=d.turn;
            renderGame();
            if(players.some(p=>p.hand.length===0)) gameActive=false;
        }
    });
}

function startGame(localPlayerId=0,numPlayers=4){
    playerId = localPlayerId;
    initPlayers(numPlayers);
    createDeck();
    dealCards();
    renderGame();
    gameActive=true;
}

// --- BOTTONI UI ---
document.getElementById("playBotBtn").onclick=()=>startGame(0,4);
document.getElementById("copyBtn").onclick=()=>{navigator.clipboard.writeText(document.getElementById("myPeerId").innerText); showToast("ID COPIATO!");};
