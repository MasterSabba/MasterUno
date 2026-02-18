/* ═══════════════════════════════════════════════════════════════
MASTERUNO — BOMBA EDITION  |  script.js
═══════════════════════════════════════════════════════════════ */

// ── CONSTANTS ──
const COLORS = [“red”,“blue”,“green”,“yellow”];
const VALUES = [“0”,“1”,“2”,“3”,“4”,“5”,“6”,“7”,“8”,“9”,“skip”,“reverse”,“draw2”];
const BOT_NAMES = [“🤖 ROBO”, “🦾 JARVIS”, “👾 MEGA”];

// ── STATE ──
let deck=[], hands=[], playerNames=[], topCard=null, currentColor=””;
let drawStack=0, turn=0, direction=1, gameActive=false, hasSaidUno=false;
let myPlayerIndex=0, numPlayers=2;
let settings = { rule0:false, rule7:false, ruleStack:true, ruleMulti:false, numPlayers:2 };

// ── MULTIPLAYER ──
let peer, conn, isMultiplayer=false, amHost=false;
let myName = “PLAYER”;

// ══════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════
function getAccounts() { return JSON.parse(localStorage.getItem(‘mu_accounts’)||’{}’); }
function saveAccounts(a) { localStorage.setItem(‘mu_accounts’, JSON.stringify(a)); }

// ══════════════════════════════════════════════════
//  SCREEN MANAGER  — the fix
// ══════════════════════════════════════════════════
function showScreen(id) {
document.querySelectorAll(’.screen’).forEach(s => {
s.classList.remove(‘active’);
});
document.getElementById(id).classList.add(‘active’);
}

// ══════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════
function showToast(msg, ms=2800) {
const c = document.getElementById(‘toast-container’);
const t = document.createElement(‘div’);
t.className = ‘toast’; t.innerText = msg;
c.appendChild(t);
setTimeout(()=>{ t.style.transition=‘opacity .4s’; t.style.opacity=‘0’; setTimeout(()=>t.remove(),450); }, ms);
}

// ══════════════════════════════════════════════════
//  DRAW ANIMATION
// ══════════════════════════════════════════════════
function animDraw(fromEl, toEl, cb) {
const a = document.getElementById(‘drawAnim’);
if (!fromEl || !toEl) { cb && cb(); return; }
const fr = fromEl.getBoundingClientRect();
const tr = toEl.getBoundingClientRect();
Object.assign(a.style, { left: fr.left+‘px’, top: fr.top+‘px’, transform:‘scale(1)’, opacity:‘1’, transition:‘none’ });
a.classList.remove(‘hidden’);
requestAnimationFrame(() => requestAnimationFrame(() => {
Object.assign(a.style, {
transition:‘left .38s cubic-bezier(.4,0,.2,1),top .38s cubic-bezier(.4,0,.2,1),opacity .38s’,
left: tr.left+‘px’, top: tr.top+‘px’, opacity:‘0.15’
});
setTimeout(() => { a.classList.add(‘hidden’); cb && cb(); }, 420);
}));
}

// ══════════════════════════════════════════════════
//  DECK
// ══════════════════════════════════════════════════
function createDeck() {
deck = [];
COLORS.forEach(c => VALUES.forEach(v => {
deck.push({color:c,value:v});
if(v!==“0”) deck.push({color:c,value:v});
}));
for(let i=0;i<4;i++){
deck.push({color:“wild”,value:“W”});
deck.push({color:“wild4”,value:“wild4”});
}
shuffle(deck);
}
function shuffle(a){ for(let i=a.length-1;i>0;i–){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

function drawCards(pIdx, qty) {
for(let i=0;i<qty;i++){
if(!deck.length) createDeck();
hands[pIdx].push(deck.pop());
}
}

// ══════════════════════════════════════════════════
//  VALID MOVE
// ══════════════════════════════════════════════════
function isValid(card) {
if(drawStack > 0) {
if(!settings.ruleStack) return false;
if(topCard.value===“draw2”) return card.value===“draw2” || card.value===“wild4”;
if(topCard.value===“wild4”) return card.value===“wild4”;
return false;
}
return card.color===currentColor || card.value===topCard.value ||
card.color===“wild” || card.color===“wild4”;
}

// ══════════════════════════════════════════════════
//  FORMAT
// ══════════════════════════════════════════════════
function fmt(v){
return {draw2:”+2”,wild4:”+4”,skip:“Ø”,reverse:“⇄”,W:“🎨”}[v]||v;
}

// ══════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════
function render() {
if(!gameActive) return;
renderOpponents();
renderHand();
renderDiscard();
renderTurn();
renderUnoBtn();
renderColorDot();
}

function renderTurn() {
const el = document.getElementById(‘turnIndicator’);
const mine = turn===myPlayerIndex;
el.innerText = mine ? “🟢 IL TUO TURNO” : `🔴 TURNO DI ${playerNames[turn]||'BOT'}`;
el.className = ‘turn-pill’ + (mine?’ my-turn’:’’);
}

function renderOpponents() {
const area = document.getElementById(‘opponentsArea’);
area.innerHTML=’’;
for(let i=0;i<numPlayers;i++){
if(i===myPlayerIndex) continue;
const active = turn===i;
const slot = document.createElement(‘div’);
slot.className = ‘opp-slot’+(active?’ my-turn-slot’:’’);
const count = (hands[i]||[]).length;
const cards = Array.from({length:Math.min(count,5)},()=>
`<div class="mini-back"><span style="font-size:5px">M</span><span style="font-size:5px">U</span></div>`
).join(’’);
slot.innerHTML=` <div class="opp-name">${playerNames[i]||'BOT'}</div> <div class="opp-cards">${cards}</div> <div class="opp-count">${count} carte</div>`;
area.appendChild(slot);
}
}

function renderHand() {
const h = document.getElementById(‘playerHand’);
h.innerHTML=’’;
const myHand = hands[myPlayerIndex]||[];
myHand.forEach((card,idx)=>{
const el = document.createElement(‘div’);
const v = fmt(card.value);
el.className=`card ${card.color}`;
el.setAttribute(‘data-val’,v);
el.innerText=v;
if(turn!==myPlayerIndex || !isValid(card)) el.classList.add(‘dim’);
el.onclick=()=>playCard(myPlayerIndex,idx);
h.appendChild(el);
});
document.getElementById(‘playerBadge’).innerText=`TU: ${myHand.length}`;
}

function renderDiscard() {
const d = document.getElementById(‘discardPile’);
if(!topCard){d.innerHTML=’’;return;}
const v=fmt(topCard.value);
d.innerHTML=`<div class="card ${currentColor}" data-val="${v}" style="pointer-events:none;margin:0">${v}</div>`;
}

function renderColorDot() {
const dot = document.getElementById(‘colorDot’);
if(!topCard){dot.className=‘color-dot’;return;}
dot.className=`color-dot show ${currentColor}`;
}

function renderUnoBtn() {
const btn = document.getElementById(‘masterUnoBtn’);
const myH = hands[myPlayerIndex]||[];
const canPlay = myH.some(c=>isValid(c));
(myH.length===2 && turn===myPlayerIndex && gameActive && canPlay)
? btn.classList.remove(‘hidden’)
: btn.classList.add(‘hidden’);
}

// ══════════════════════════════════════════════════
//  PLAY CARD
// ══════════════════════════════════════════════════
function playCard(pIdx, cIdx) {
if(turn!==pIdx || !gameActive) return;
const hand = hands[pIdx];
const card = hand[cIdx];
if(!isValid(card)) return;

// MasterUno penalty
if(pIdx===myPlayerIndex && hand.length===2 && !hasSaidUno){
showToast(“NON HAI DETTO MASTERUNO! +2 🃏”);
drawCards(pIdx,2); nextTurn(); return;
}

hand.splice(cIdx,1);
topCard=card; hasSaidUno=false;

if(card.value===“draw2”) drawStack+=2;
if(card.value===“wild4”) drawStack+=4;
if(card.value===“reverse”){
direction*=-1;
if(numPlayers===2) turn=(turn+direction+numPlayers)%numPlayers;
}
if(card.value===“skip”) turn=(turn+direction+numPlayers)%numPlayers;

// Rule 0
if(card.value===“0” && settings.rule0){
showToast(“REGOLA 0: TUTTI SCAMBIANO! 🔄”);
const tmp=hands.map(h=>[…h]);
for(let i=0;i<numPlayers;i++) hands[(i+direction+numPlayers)%numPlayers]=tmp[i];
}

// Rule 7
if(card.value===“7” && settings.rule7){
if(pIdx===myPlayerIndex){ render(); showSwapPicker(pIdx); return; }
else {
const others=[…Array(numPlayers).keys()].filter(i=>i!==pIdx);
const tgt=others[Math.floor(Math.random()*others.length)];
[hands[pIdx],hands[tgt]]=[hands[tgt],hands[pIdx]];
showToast(`${playerNames[pIdx]} SCAMBIA CON ${playerNames[tgt]}! 🤝`);
}
}

// Wild
if(card.color===“wild”||card.color===“wild4”){
if(pIdx===myPlayerIndex){ render(); document.getElementById(‘colorPicker’).classList.remove(‘hidden’); return; }
else { currentColor=COLORS[Math.floor(Math.random()*4)]; }
} else { currentColor=card.color; }

if(isMultiplayer && amHost) broadcastState();
afterPlay();
}

function afterPlay() {
render();
// Check win
for(let i=0;i<numPlayers;i++){
if((hands[i]||[]).length===0){
gameActive=false;
const iWin=(i===myPlayerIndex);
if(isMultiplayer && conn && conn.open)
conn.send({type:‘GAME_OVER’,winnerIdx:i,winnerName:playerNames[i]});
setTimeout(()=>showEndScreen(iWin, playerNames[i]),600);
return;
}
}
turn=(turn+direction+numPlayers)%numPlayers;
if(isMultiplayer && amHost) broadcastState();
render();
if(turn!==myPlayerIndex && !isMultiplayer) setTimeout(botTurn, 900+Math.random()*600);
}

// ══════════════════════════════════════════════════
//  SWAP PICKER
// ══════════════════════════════════════════════════
function showSwapPicker(myIdx) {
const picker=document.getElementById(‘swapPicker’);
const tgts=document.getElementById(‘swapTargets’);
tgts.innerHTML=’’;
for(let i=0;i<numPlayers;i++){
if(i===myIdx) continue;
const btn=document.createElement(‘div’);
btn.className=‘swap-btn’;
btn.innerText=playerNames[i]||`BOT ${i}`;
btn.onclick=()=>{
[hands[myIdx],hands[i]]=[hands[i],hands[myIdx]];
showToast(`HAI SCAMBIATO CON ${playerNames[i]}! 🤝`);
picker.classList.add(‘hidden’);
currentColor=topCard.color.includes(‘wild’)?currentColor:topCard.color;
if(isMultiplayer && amHost) broadcastState();
afterPlay();
};
tgts.appendChild(btn);
}
picker.classList.remove(‘hidden’);
}

window.setWildColor=(c)=>{
currentColor=c;
document.getElementById(‘colorPicker’).classList.add(‘hidden’);
showToast(“COLORE: “+c.toUpperCase()+” “+{red:‘🔴’,blue:‘🔵’,green:‘🟢’,yellow:‘🟡’}[c]);
if(isMultiplayer && amHost) broadcastState();
afterPlay();
};

// ══════════════════════════════════════════════════
//  BOT TURN
// ══════════════════════════════════════════════════
function botTurn() {
if(!gameActive || turn===myPlayerIndex) return;
const hand=hands[turn];
const idx=hand.findIndex(c=>isValid(c));
if(idx!==-1){
if(hand.length===2) showToast(`${playerNames[turn]} dice MASTERUNO! 🔥`);
playCard(turn,idx);
} else {
if(drawStack>0){
showToast(`${playerNames[turn]} PESCA ${drawStack} CARTE 🃏`);
drawCards(turn,drawStack); drawStack=0;
} else { drawCards(turn,1); }
nextTurn();
}
}

function nextTurn(){
turn=(turn+direction+numPlayers)%numPlayers;
if(isMultiplayer && amHost) broadcastState();
render();
if(turn!==myPlayerIndex && !isMultiplayer) setTimeout(botTurn,900+Math.random()*600);
}

// ══════════════════════════════════════════════════
//  DECK CLICK
// ══════════════════════════════════════════════════
document.getElementById(‘deck’).onclick=()=>{
if(turn!==myPlayerIndex || !gameActive) return;
const deckEl=document.getElementById(‘deck’);
const handEl=document.getElementById(‘playerHand’);

const doAfter=()=>{
if(drawStack>0){
showToast(`PESCHI ${drawStack} CARTE 🃏`);
drawCards(myPlayerIndex,drawStack); drawStack=0;
} else { drawCards(myPlayerIndex,1); }
if(isMultiplayer && amHost) broadcastState();
nextTurn();
};
animDraw(deckEl,handEl,doAfter);
};

// ══════════════════════════════════════════════════
//  MASTERUNO BUTTON
// ══════════════════════════════════════════════════
document.getElementById(‘masterUnoBtn’).onclick=()=>{
hasSaidUno=true;
showToast(“🔥 MASTERUNO!”);
document.getElementById(‘masterUnoBtn’).classList.add(‘hidden’);
};

// ══════════════════════════════════════════════════
//  START GAME
// ══════════════════════════════════════════════════
function startGame() {
numPlayers=settings.numPlayers;
gameActive=true; hasSaidUno=false; direction=1; drawStack=0;
myPlayerIndex=0;
createDeck(); hands=[]; playerNames=[];

for(let i=0;i<numPlayers;i++){
hands.push([]);
playerNames.push(i===0 ? myName.toUpperCase() : (BOT_NAMES[i-1]||`BOT ${i}`));
drawCards(i,7);
}

topCard=deck.pop();
while(topCard.color.includes(‘wild’)){ deck.unshift(topCard); topCard=deck.pop(); }
currentColor=topCard.color;
turn=0;

showScreen(‘gameArea’);
render();

if(isMultiplayer && amHost && conn)
conn.send({type:‘START’, state:buildState(), myIdx:1, names:playerNames});

if(!isMultiplayer && turn!==myPlayerIndex) setTimeout(botTurn,1200);
}

// ══════════════════════════════════════════════════
//  MULTIPLAYER
// ══════════════════════════════════════════════════
function buildState(){
return {deck,hands,topCard,currentColor,drawStack,turn,direction,numPlayers,settings};
}
function applyState(s){
({deck,hands,topCard,currentColor,drawStack,turn,direction,numPlayers,settings}=s);
}
function broadcastState(){
if(conn&&conn.open) conn.send({type:‘STATE’,state:buildState()});
}

function initPeer(){
const id=Math.random().toString(36).substr(2,5).toUpperCase();
peer=new Peer(id);
peer.on(‘open’,id=>{
document.getElementById(‘myPeerId’).innerText=id;
document.getElementById(‘lobbyStatus’).innerText=‘Online! Condividi il tuo codice.’;
});
peer.on(‘connection’,c=>{
conn=c; isMultiplayer=true; amHost=true;
setupConn();
showToast(“AVVERSARIO CONNESSO! 🎮 Avvio…”);
document.getElementById(‘lobbyStatus’).innerText=‘Connesso! Avvio partita…’;
setTimeout(()=>startGame(),1500);
});
}

function connectToPeer(friendId){
isMultiplayer=true; amHost=false;
conn=peer.connect(friendId);
setupConn();
}

function setupConn(){
conn.on(‘open’,()=>{
showToast(“CONNESSO! ✅”);
document.getElementById(‘lobbyStatus’).innerText=‘Connesso!’;
});
conn.on(‘data’,d=>{
if(d.type===‘START’){
myPlayerIndex=d.myIdx; playerNames=d.names;
applyState(d.state); gameActive=true;
showScreen(‘gameArea’); render();
}
else if(d.type===‘STATE’){ applyState(d.state); render(); }
else if(d.type===‘CHAT’){ addChatMsg(d.sender,d.text,false); }
else if(d.type===‘GAME_OVER’){
gameActive=false;
setTimeout(()=>showEndScreen(d.winnerIdx===myPlayerIndex,d.winnerName),600);
}
});
conn.on(‘close’,()=>{ showToast(“Avversario disconnesso 😢”); gameActive=false; });
}

// ══════════════════════════════════════════════════
//  CHAT
// ══════════════════════════════════════════════════
function addChatMsg(sender,text,isMe){
const msgs=document.getElementById(‘chatMessages’);
const isEmoji=/^\p{Emoji}+$/u.test(text.trim());
const d=document.createElement(‘div’);
d.className=`chat-msg ${isMe?'mine':'theirs'}${isEmoji?' big-emo':''}`;
if(!isEmoji) d.innerHTML=`<div class="msg-sender">${sender}</div>${text}`;
else d.innerText=text;
msgs.appendChild(d);
msgs.scrollTop=msgs.scrollHeight;
}

function sendEmoji(e){
addChatMsg(myName,e,true);
if(conn&&conn.open) conn.send({type:‘CHAT’,sender:myName,text:e});
}

document.getElementById(‘chatSendBtn’).onclick=()=>{
const inp=document.getElementById(‘chatInput’);
const t=inp.value.trim(); if(!t)return;
inp.value=’’;
addChatMsg(myName,t,true);
if(conn&&conn.open) conn.send({type:‘CHAT’,sender:myName,text:t});
};
document.getElementById(‘chatInput’).onkeydown=e=>{ if(e.key===‘Enter’) document.getElementById(‘chatSendBtn’).click(); };
document.getElementById(‘chatToggleBtn’).onclick=()=>toggleChat();
document.getElementById(‘chatCloseBtn’).onclick=()=>toggleChat(false);
function toggleChat(force){
const p=document.getElementById(‘chatPanel’);
const show=force!==undefined?force:p.classList.contains(‘hidden’);
show?p.classList.remove(‘hidden’):p.classList.add(‘hidden’);
}

// ══════════════════════════════════════════════════
//  END SCREEN
// ══════════════════════════════════════════════════
function showEndScreen(win,winnerName){
document.getElementById(‘endIcon’).innerText=win?‘🏆’:‘💀’;
const t=document.getElementById(‘endTitle’);
t.className=’end-title ’+(win?‘win’:‘lose’);
t.innerText=win?‘VITTORIA!’:‘HAI PERSO!’;
document.getElementById(‘endSubtitle’).innerText=win
?`Complimenti ${myName}! Hai battuto tutti!`
:`${winnerName||'Qualcuno'} ha vinto. Rivincita?`;
if(win) confetti({particleCount:200,spread:90,origin:{y:0.5},zIndex:15000});
showScreen(‘endScreen’);
}

// ══════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════
function openPanel(){ document.getElementById(‘settingsPanel’).classList.add(‘open’); document.getElementById(‘panelBg’).classList.add(‘visible’); }
function closePanel(){ document.getElementById(‘settingsPanel’).classList.remove(‘open’); document.getElementById(‘panelBg’).classList.remove(‘visible’); }

document.getElementById(‘settingsBtn’).onclick=openPanel;
document.getElementById(‘closeSettings’).onclick=closePanel;
document.getElementById(‘panelBg’).onclick=closePanel;

document.getElementById(‘numPlayersGroup’).querySelectorAll(’.rpill’).forEach(pill=>{
pill.onclick=()=>{
document.querySelectorAll(’.rpill’).forEach(p=>p.classList.remove(‘active’));
pill.classList.add(‘active’);
settings.numPlayers=parseInt(pill.dataset.val);
};
});
document.getElementById(‘rule0’).onchange=e=>settings.rule0=e.target.checked;
document.getElementById(‘rule7’).onchange=e=>settings.rule7=e.target.checked;
document.getElementById(‘ruleStack’).onchange=e=>settings.ruleStack=e.target.checked;
document.getElementById(‘ruleMulti’).onchange=e=>settings.ruleMulti=e.target.checked;

// ══════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════
function doLogin(){
const name=document.getElementById(‘loginName’).value.trim();
const pass=document.getElementById(‘loginPass’).value;
if(!name||!pass){ showToast(“Inserisci nome e password! ⚠️”); return; }

const acc=getAccounts();
if(acc[name]){
if(acc[name]!==pass){ showToast(“Password errata! ❌”); return; }
showToast(`Bentornato, ${name}! 👋`);
} else {
acc[name]=pass; saveAccounts(acc);
showToast(`Account creato! Benvenuto, ${name}! 🎉`);
}

myName=name.toUpperCase();
document.getElementById(‘lobbyPlayerTag’).innerText=myName;
showScreen(‘lobbyScreen’);
initPeer();
}

document.getElementById(‘loginBtn’).onclick=doLogin;
document.getElementById(‘loginPass’).onkeydown=e=>{ if(e.key===‘Enter’) doLogin(); };
document.getElementById(‘loginName’).onkeydown=e=>{ if(e.key===‘Enter’) document.getElementById(‘loginPass’).focus(); };

// ══════════════════════════════════════════════════
//  LOBBY BUTTONS
// ══════════════════════════════════════════════════
document.getElementById(‘copyBtn’).onclick=()=>{
const id=document.getElementById(‘myPeerId’).innerText;
navigator.clipboard.writeText(id)
.then(()=>showToast(“📋 Codice copiato! Mandalo al tuo amico.”))
.catch(()=>showToast(“ID: “+id));
};

document.getElementById(‘connectBtn’).onclick=()=>{
const id=document.getElementById(‘friendIdInput’).value.trim().toUpperCase();
if(!id){ showToast(“Inserisci l’ID del tuo amico! ⚠️”); return; }
connectToPeer(id);
document.getElementById(‘lobbyStatus’).innerText=`Connessione a ${id}...`;
};

document.getElementById(‘playBotBtn’).onclick=()=>{ isMultiplayer=false; amHost=false; startGame(); };

document.getElementById(‘playAgainBtn’).onclick=()=>{ gameActive=false; isMultiplayer=false; conn=null; startGame(); };
document.getElementById(‘exitBtn’).onclick=()=>location.reload();
