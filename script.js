// --- GIOCO UNO 4 GIOCATORI + BOT + MULTIPLAYER --- //

const colors = ["red", "blue", "green", "yellow"];
const values = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
let deck = [], hands = [], topCard = null, currentColor = "", drawStack = 0;
let isMyTurn = true, hasSaidUno = false, gameActive = false;
let playerName = "", numPlayers = 2, swapRule = "0"; // default

// --- CREAZIONE MAZZO ---
function createDeck() {
    deck = [];
    colors.forEach(c => {
        values.forEach(v => {
            deck.push({color: c, value: v});
            if(v !== "0") deck.push({color: c, value: v});
        });
    });
    for(let i=0;i<4;i++){ deck.push({color:"wild", value:"W"}); deck.push({color:"wild4", value:"wild4"}); }
    deck.sort(() => Math.random()-0.5);
}

// --- TOAST ALERT ---
function showToast(msg) {
    let container = document.getElementById('toast-container');
    if(!container){ container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    const t = document.createElement('div'); t.className='toast'; t.innerText = msg;
    container.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),500); }, 2500);
}

// --- MOVE VALIDA ---
function isValidMove(card){
    if(drawStack>0){
        if(topCard.value==="draw2") return card.value==="draw2";
        if(topCard.value==="wild4") return card.value==="wild4";
        return false;
    }
    return card.color===currentColor || card.value===topCard.value || card.color.includes("wild");
}

// --- GIOCA CARTA ---
function playCard(playerIdx, cardIdx){
    if(!isMyTurn || !gameActive) return;
    const hand = hands[playerIdx];
    const card = hand[cardIdx];

    if(isValidMove(card)){
        if(hand.length===2 && !hasSaidUno){
            showToast("NON HAI DETTO MASTERUNO! +2 🃏");
            for(let i=0;i<2;i++) if(deck.length>0) hand.push(deck.pop());
            isMyTurn=false; finishAction(playerIdx); return;
        }

        hand.splice(cardIdx,1);
        topCard = card;
        hasSaidUno=false;
        if(card.value==="draw2") drawStack+=2;
        if(card.value==="wild4") drawStack+=4;

        if(card.color.includes("wild")){
            renderGame();
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor=card.color;
            finishAction(playerIdx);
        }
    }
}

// --- SCEGLI COLORE WILD ---
window.setWildColor = (c)=>{
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    showToast("COLORE SCELTO: "+c.toUpperCase());
    finishAction(0);
};

// --- FINE TURNO ---
function finishAction(playerIdx){
    renderGame();

    if(hands[playerIdx].length===0){
        gameActive=false;
        showEndScreen(true);
        return;
    }

    // gestisci skip/reverse semplice
    let next = (playerIdx + 1) % numPlayers;
    isMyTurn = !isMyTurn;

    if(!isMultiplayer){
        setTimeout(()=>botTurn(next),1200);
    } else if(isMultiplayer && conn){
        sendMove();
    }
}

// --- TURNO BOT ---
function botTurn(botIdx){
    if(!gameActive) return;
    const hand = hands[botIdx];
    let idx = hand.findIndex(c => isValidMove(c));
    if(idx!==-1){
        const card = hand.splice(idx,1)[0];
        topCard = card;
        if(card.value==="draw2") drawStack+=2;
        if(card.value==="wild4") drawStack+=4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;

        if(hand.length===0){
            renderGame(); gameActive=false; showEndScreen(false); return;
        }
        finishAction(botIdx);
    } else {
        if(drawStack>0){
            for(let i=0;i<drawStack;i++) if(deck.length>0) hand.push(deck.pop());
            drawStack=0;
            showToast("BOT PESCA E PASSA");
        } else if(deck.length>0) hand.push(deck.pop());
        finishAction(botIdx);
    }
}

// --- RENDER GAME ---
function renderGame(){
    for(let i=0;i<numPlayers;i++){
        const h = document.getElementById(i===0?"playerHand":"opponentHand"+i);
        if(!h) continue;
        h.innerHTML="";
        hands[i].forEach((c,idx)=>{
            const cardDiv = document.createElement("div");
            const v = c.value==="draw2"?"+2":c.value==="wild4"?"+4":c.value==="skip"?"Ø":c.value==="reverse"?"⇄":c.value;
            cardDiv.className=`card ${c.color}`;
            cardDiv.innerText=v;
            cardDiv.setAttribute("data-val",v);
            if(i===0) cardDiv.onclick=()=>playCard(0,idx);
            h.appendChild(cardDiv);
        });

        const badge = document.getElementById(i===0?"playerBadge":"opponentBadge"+i);
        if(badge) badge.innerText = (i===0?"TU":"AVVERSARIO "+i)+": "+hands[i].length;
    }

    const discard = document.getElementById("discardPile");
    const vTop = topCard ? (topCard.value==="draw2"?"+2":topCard.value==="wild4"?"+4":topCard.value==="skip"?"Ø":topCard.value==="reverse"?"⇄":topCard.value) : "";
    discard.innerHTML = topCard?`<div class="card ${currentColor}" data-val="${vTop}">${vTop}</div>`:"";

    const hasPlayable = hands[0].some(c => isValidMove(c));
    const btnUno = document.getElementById("masterUnoBtn");
    if(hands[0].length===2 && isMyTurn && gameActive && hasPlayable) btnUno.classList.remove("hidden");
    else btnUno.classList.add("hidden");
}

// --- PESCATA MAZZO ---
document.getElementById("deck").onclick = ()=>{
    if(!isMyTurn || !gameActive) return;
    if(drawStack>0){
        showToast("PESCHI "+drawStack+" CARTE 🃏");
        for(let i=0;i<drawStack;i++) if(deck.length>0) hands[0].push(deck.pop());
        drawStack=0;
    } else if(deck.length>0) hands[0].push(deck.pop());
    isMyTurn=false;
    if(!isMultiplayer) setTimeout(()=>botTurn(1),1000);
    renderGame();
};

// --- START PARTITA ---
function startGame(){
    gameActive=true; createDeck();
    hands=[]; 
    for(let i=0;i<numPlayers;i++){ 
        hands.push([]);
        for(let j=0;j<7;j++) hands[i].push(deck.pop());
    }
    topCard=deck.pop(); while(topCard.color.includes("wild")) topCard=deck.pop();
    currentColor=topCard.color;
    isMyTurn=true; drawStack=0;
    renderGame();
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("gameArea").classList.remove("hidden");
}

// --- MASTERUNO ---
document.getElementById("masterUnoBtn").onclick=()=>{
    hasSaidUno=true;
    showToast("MASTERUNO! 🔥");
};

// --- END SCREEN ---
function showEndScreen(win){
    const screen=document.getElementById("endScreen");
    const title=document.getElementById("endTitle");
    screen.classList.remove("hidden");
    title.innerText = win?"HAI VINTO!":"HAI PERSO!";
    title.className="end-title "+(win?"win-text":"lose-text");
}

// --- BOTTONI UI ---
document.getElementById("playBotBtn").onclick = ()=>{
    isMultiplayer=false;
    startGame();
};
document.getElementById("playAgainBtn").onclick = ()=>startGame();
document.getElementById("exitBtn").onclick = ()=>location.reload();

// --- IMPOSTAZIONI ---
document.getElementById("settingsBtn").onclick=()=>{
    const np = parseInt(prompt("Numero di giocatori (2-4)","2"));
    const swap = prompt("Regola scambio carte (0=tutti,7=scelta)","0");
    const name = prompt("Nome giocatore","TU");
    if(np>=2 && np<=4) numPlayers=np;
    swapRule=swap;
    playerName=name;
};
