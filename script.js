// --- GIOCO ---
const colors = ["red","blue","green","yellow"];
const values = ["0","1","2","3","4","5","6","7","8","9","skip","reverse","draw2"];
let deck=[], players=[], playerName="", numPlayers=2, swapRule=0, playerIndex=0, topCard=null, currentColor="";
let isMyTurn=true, hasSaidUno=false, drawStack=0, peer, conn, isMultiplayer=false, gameActive=true;

// --- INIZIALIZZAZIONE ---
function createDeck(){
    deck=[];
    colors.forEach(c=>{
        values.forEach(v=>{
            deck.push({color:c,value:v});
            if(v!=="0") deck.push({color:c,value:v});
        });
    });
    for(let i=0;i<4;i++) deck.push({color:"wild",value:"W"},{color:"wild4",value:"wild4"});
    deck.sort(()=>Math.random()-0.5);
}

// --- TOAST ---
function showToast(m){
    const container=document.getElementById('toast-container');
    const t=document.createElement('div');
    t.className='toast'; t.innerText=m;
    container.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),500); },2500);
}

// --- LOGICA ---
function isValidMove(card){
    if(drawStack>0){
        if(topCard.value==="draw2") return card.value==="draw2";
        if(topCard.value==="wild4") return card.value==="wild4";
        return false;
    }
    return card.color===currentColor||card.value===topCard.value||card.color.includes("wild");
}

function playCard(i){
    if(!isMyTurn||!gameActive) return;
    const card=players[playerIndex].hand[i];
    if(isValidMove(card)){
        if(players[playerIndex].hand.length===2&&!hasSaidUno){
            showToast("NON HAI DETTO MASTERUNO! +2 🃏");
            for(let j=0;j<2;j++) if(deck.length>0) players[playerIndex].hand.push(deck.pop());
            isMyTurn=false; finishAction(); return;
        }
        players[playerIndex].hand.splice(i,1);
        topCard=card; hasSaidUno=false;
        if(card.value==="draw2") drawStack+=2;
        if(card.value==="wild4") drawStack+=4;
        if(card.color.includes("wild")){
            renderGame();
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor=card.color;
            finishAction();
        }
    }
}

window.setWildColor=(c)=>{ currentColor=c; document.getElementById("colorPicker").classList.add("hidden"); showToast("COLORE SCELTO: "+c.toUpperCase()); finishAction(); };

function finishAction(){
    renderGame();
    if(players[playerIndex].hand.length===0){
        gameActive=false;
        setTimeout(()=>showEndScreen(true),500);
        return;
    }
    isMyTurn=!isMyTurn;
    if(!isMultiplayer&&!isMyTurn) setTimeout(botTurn,1200);
    renderGame();
}

// --- BOT ---
function botTurn(){
    const botIndex=(playerIndex+1)%numPlayers;
    const botHand=players[botIndex].hand;
    let idx=botHand.findIndex(c=>isValidMove(c));
    if(idx!==-1){
        const card=botHand.splice(idx,1)[0]; topCard=card;
        if(card.value==="draw2") drawStack+=2;
        if(card.value==="wild4") drawStack+=4;
        currentColor=card.color.includes("wild")?colors[Math.floor(Math.random()*4)]:card.color;
        if(botHand.length===0){ renderGame(); gameActive=false; setTimeout(()=>showEndScreen(false),500); return; }
    } else {
        if(drawStack>0){ for(let i=0;i<drawStack;i++) if(deck.length>0) botHand.push(deck.pop()); drawStack=0; showToast("BOT PESCA E PASSA"); }
        else if(deck.length>0) botHand.push(deck.pop());
    }
    isMyTurn=true; renderGame();
}

// --- RENDER ---
function renderGame(){
    document.getElementById("playerBadge").innerText=`${players[playerIndex].name}: ${players[playerIndex].hand.length}`;
    const pHand=document.getElementById("playerHand"); pHand.innerHTML="";
    players[playerIndex].hand.forEach((c,i)=>{
        const d=document.createElement("div");
        const v=(c.value==="draw2"?"+2":c.value==="wild4"?"+4":c.value==="skip"?"Ø":c.value==="reverse"?"⇄":c.value);
        d.className=`card ${c.color}`; d.innerText=v; d.setAttribute('data-val',v); d.onclick=()=>playCard(i);
        pHand.appendChild(d);
    });
    const discard=document.getElementById("discardPile");
    const vTop=(topCard.value==="draw2"?"+2":topCard.value==="wild4"?"+4":topCard.value==="skip"?"Ø":topCard.value==="reverse"?"⇄":topCard.value);
    discard.innerHTML=`<div class="card ${currentColor}" data-val="${vTop}">${vTop}</div>`;
    const hasPlayable=players[playerIndex].hand.some(c=>isValidMove(c));
    const btnUno=document.getElementById("masterUnoBtn");
    if(players[playerIndex].hand.length===2 && isMyTurn && gameActive && hasPlayable) btnUno.classList.remove("hidden");
    else btnUno.classList.add("hidden");
}

// --- MASTERUNO ---
document.getElementById("masterUnoBtn").onclick=()=>{ hasSaidUno=true; showToast("MASTERUNO! 🔥"); };

// --- START GAME ---
document.getElementById("playBotBtn").onclick=()=>{
    playerName=document.getElementById("playerNameInput").value||"TU";
    numPlayers=parseInt(document.getElementById("numPlayers").value);
    swapRule=parseInt(document.getElementById("swapRule").value);
    players=[]; for(let i=0;i<numPlayers;i++){ players.push({name:i===0?playerName:"BOT "+i,hand:[]}); }
    startGame(true);
};

// --- DECK ---
document.getElementById("deck").onclick=()=>{
    if(!isMyTurn||!gameActive) return;
    if(drawStack>0){ showToast("PESCHI "+drawStack+" CARTE 🃏"); for(let i=0
