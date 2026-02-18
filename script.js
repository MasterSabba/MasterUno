/* ═══════════════════════════════════════════════
MASTERUNO — BOMBA EDITION  |  script.js
═══════════════════════════════════════════════ */
document.addEventListener(‘DOMContentLoaded’, () => {

// ── CONSTANTS ──
const COLORS = [“red”,“blue”,“green”,“yellow”];
const VALUES  = [“0”,“1”,“2”,“3”,“4”,“5”,“6”,“7”,“8”,“9”,“skip”,“reverse”,“draw2”];
const BOT_NAMES = [“🤖 ROBO”,“🦾 JARVIS”,“👾 MEGA”];

// ── STATE ──
let deck=[], hands=[], names=[], topCard=null, currentColor=””;
let drawStack=0, turn=0, dir=1, gameActive=false, saidUno=false;
let myIdx=0, numPlayers=2;
let cfg = { rule0:false, rule7:false, stack:true, multi:false, numPlayers:2 };

// ── MULTIPLAYER ──
let peer, conn, isMP=false, amHost=false, myName=“PLAYER”;

/* ═══════════════════════════════════════════════
SCREEN MANAGER — uses direct style.display only
so CSS class conflicts are IMPOSSIBLE
═══════════════════════════════════════════════ */
const SCREENS = [‘s-login’,‘s-lobby’,‘s-game’,‘s-end’];

function showScreen(id) {
SCREENS.forEach(s => {
const el = document.getElementById(s);
el.style.display = (s === id) ? ‘flex’ : ‘none’;
});
}

// ── TOAST ──
function toast(msg, ms=2800) {
const c = document.getElementById(‘toasts’);
const t = document.createElement(‘div’);
t.className = ‘toast’; t.innerText = msg;
c.appendChild(t);
setTimeout(() => {
t.style.transition = ‘opacity .4s’;
t.style.opacity = ‘0’;
setTimeout(() => t.remove(), 450);
}, ms);
}

// ── DRAW ANIMATION ──
function animateDraw(cb) {
const anim   = document.getElementById(‘drawAnim’);
const deckEl = document.getElementById(‘deckEl’);
const handEl = document.getElementById(‘playerHand’);
if (!deckEl || !handEl) { cb && cb(); return; }
const fr = deckEl.getBoundingClientRect();
const tr = handEl.getBoundingClientRect();
Object.assign(anim.style, {
left: fr.left+‘px’, top: fr.top+‘px’,
opacity:‘1’, transition:‘none’, display:‘flex’
});
requestAnimationFrame(() => requestAnimationFrame(() => {
Object.assign(anim.style, {
transition:‘left .38s cubic-bezier(.4,0,.2,1),top .38s,opacity .38s’,
left: (tr.left + tr.width/2 - 41)+‘px’,
top:  (tr.top)+‘px’, opacity:‘0.1’
});
setTimeout(() => { anim.style.display=‘none’; cb && cb(); }, 420);
}));
}

// ── DECK ──
function buildDeck() {
deck = [];
COLORS.forEach(c => VALUES.forEach(v => {
deck.push({color:c,value:v});
if (v!==‘0’) deck.push({color:c,value:v});
}));
for (let i=0;i<4;i++) {
deck.push({color:‘wild’,value:‘W’});
deck.push({color:‘wild4’,value:‘wild4’});
}
for (let i=deck.length-1;i>0;i–) {
const j=Math.floor(Math.random()*(i+1));
[deck[i],deck[j]]=[deck[j],deck[i]];
}
}

function drawFrom(pIdx, qty) {
for (let i=0;i<qty;i++) {
if (!deck.length) buildDeck();
hands[pIdx].push(deck.pop());
}
}

// ── VALID MOVE ──
function isValid(card) {
if (drawStack > 0) {
if (!cfg.stack) return false;
if (topCard.value===‘draw2’) return card.value===‘draw2’ || card.value===‘wild4’;
if (topCard.value===‘wild4’) return card.value===‘wild4’;
return false;
}
return card.color===currentColor || card.value===topCard.value ||
card.color===‘wild’ || card.color===‘wild4’;
}

// ── FORMAT ──
function fmt(v) {
return {draw2:’+2’,wild4:’+4’,skip:‘Ø’,reverse:‘⇄’,W:‘🎨’}[v] ?? v;
}

// ── RENDER ──
function render() {
if (!gameActive) return;
renderOpponents();
renderHand();
renderDiscard();
renderTurn();
renderUnoBtn();
renderColorDot();
}

function renderTurn() {
const el = document.getElementById(‘turnBadge’);
const mine = turn===myIdx;
el.textContent = mine ? ‘🟢 IL TUO TURNO’ : `🔴 TURNO DI ${names[turn]||'BOT'}`;
el.className = ‘turn-badge’ + (mine?’ my-turn’:’’);
}

function renderOpponents() {
const area = document.getElementById(‘opponentsArea’);
area.innerHTML = ‘’;
for (let i=0;i<numPlayers;i++) {
if (i===myIdx) continue;
const active = (turn===i);
const count  = (hands[i]||[]).length;
const cards  = Array.from({length:Math.min(count,6)},()=>
`<div class="mini-back"><span>M</span><span>U</span></div>`
).join(’’);
const slot = document.createElement(‘div’);
slot.className = ‘opp-slot’+(active?’ active’:’’);
slot.innerHTML = ` <div class="opp-name">${names[i]||'BOT'}</div> <div class="opp-cards">${cards}</div> <div class="opp-count">${count} carte</div>`;
area.appendChild(slot);
}
}

function renderHand() {
const el   = document.getElementById(‘playerHand’);
const myH  = hands[myIdx]||[];
el.innerHTML = ‘’;
myH.forEach((card,idx) => {
const div = document.createElement(‘div’);
const v   = fmt(card.value);
div.className = `card ${card.color}`;
div.setAttribute(‘data-val’, v);
div.textContent = v;
if (turn!==myIdx || !isValid(card)) div.classList.add(‘dim’);
div.onclick = () => playCard(myIdx, idx);
el.appendChild(div);
});
document.getElementById(‘myBadge’).textContent = `TU: ${myH.length}`;
}

function renderDiscard() {
const el = document.getElementById(‘discardEl’);
if (!topCard) { el.innerHTML=’’; return; }
const v = fmt(topCard.value);
el.innerHTML = `<div class="card ${currentColor}" data-val="${v}" style="pointer-events:none;margin:0">${v}</div>`;
}

function renderColorDot() {
const d = document.getElementById(‘colorDot’);
d.className = topCard ? `color-dot show ${currentColor}` : ‘color-dot’;
}

function renderUnoBtn() {
const btn = document.getElementById(‘unoBtn’);
const myH = hands[myIdx]||[];
const ok  = myH.length===2 && turn===myIdx && gameActive && myH.some(c=>isValid(c));
btn.style.display = ok ? ‘block’ : ‘none’;
}

// ── PLAY CARD ──
function playCard(pIdx, cIdx) {
if (turn!==pIdx || !gameActive) return;
const hand = hands[pIdx];
const card = hand[cIdx];
if (!isValid(card)) return;

// MasterUno penalty
if (pIdx===myIdx && hand.length===2 && !saidUno) {
toast(‘NON HAI DETTO MASTERUNO! +2 🃏’);
drawFrom(pIdx, 2);
advanceTurn(); render(); return;
}

hand.splice(cIdx, 1);
topCard = card; saidUno = false;

// draw stack
if (card.value===‘draw2’) drawStack += 2;
if (card.value===‘wild4’) drawStack += 4;

// reverse
if (card.value===‘reverse’) {
dir *= -1;
if (numPlayers===2) turn = (turn+dir+numPlayers)%numPlayers;
}

// skip
if (card.value===‘skip’) turn = (turn+dir+numPlayers)%numPlayers;

// rule 0
if (card.value===‘0’ && cfg.rule0) {
toast(‘REGOLA 0: TUTTI SCAMBIANO! 🔄’);
const snap = hands.map(h=>[…h]);
for (let i=0;i<numPlayers;i++) hands[(i+dir+numPlayers)%numPlayers] = snap[i];
}

// rule 7
if (card.value===‘7’ && cfg.rule7) {
if (pIdx===myIdx) { render(); showSwapPicker(pIdx); return; }
else {
const pool = […Array(numPlayers).keys()].filter(i=>i!==pIdx);
const t    = pool[Math.floor(Math.random()*pool.length)];
[hands[pIdx],hands[t]] = [hands[t],hands[pIdx]];
toast(`${names[pIdx]} SCAMBIA CON ${names[t]}! 🤝`);
}
}

// wild
if (card.color===‘wild’||card.color===‘wild4’) {
if (pIdx===myIdx) { render(); document.getElementById(‘colorPicker’).style.display=‘flex’; return; }
else currentColor = COLORS[Math.floor(Math.random()*4)];
} else {
currentColor = card.color;
}

if (isMP && amHost) broadcast();
afterPlay();
}

function afterPlay() {
render();
// win check
for (let i=0;i<numPlayers;i++) {
if ((hands[i]||[]).length===0) {
gameActive = false;
if (isMP && conn && conn.open)
conn.send({type:‘GAME_OVER’, winner:i, wName:names[i]});
setTimeout(()=>showEnd(i===myIdx, names[i]), 600);
return;
}
}
advanceTurn();
if (isMP && amHost) broadcast();
render();
if (turn!==myIdx && !isMP) setTimeout(botTurn, 900+Math.random()*500);
}

function advanceTurn() {
turn = (turn+dir+numPlayers)%numPlayers;
}

// ── BOT ──
function botTurn() {
if (!gameActive || turn===myIdx) return;
const hand = hands[turn];
const idx  = hand.findIndex(c=>isValid(c));
if (idx!==-1) {
if (hand.length===2) toast(`${names[turn]} dice MASTERUNO! 🔥`);
playCard(turn, idx);
} else {
if (drawStack>0) {
toast(`${names[turn]} PESCA ${drawStack} CARTE 🃏`);
drawFrom(turn, drawStack); drawStack=0;
} else { drawFrom(turn, 1); }
advanceTurn();
if (isMP && amHost) broadcast();
render();
if (turn!==myIdx && !isMP) setTimeout(botTurn, 900+Math.random()*500);
}
}

// ── DECK CLICK ──
document.getElementById(‘deckEl’).onclick = () => {
if (turn!==myIdx || !gameActive) return;
animateDraw(() => {
if (drawStack>0) {
toast(`PESCHI ${drawStack} CARTE 🃏`);
drawFrom(myIdx, drawStack); drawStack=0;
} else { drawFrom(myIdx, 1); }
if (isMP && amHost) broadcast();
advanceTurn(); render();
if (turn!==myIdx && !isMP) setTimeout(botTurn, 900+Math.random()*500);
});
};

// ── MASTERUNO BTN ──
document.getElementById(‘unoBtn’).onclick = () => {
saidUno = true;
toast(‘🔥 MASTERUNO!’);
document.getElementById(‘unoBtn’).style.display=‘none’;
};

// ── WILD COLOR ──
window.setWildColor = function(c) {
currentColor = c;
document.getElementById(‘colorPicker’).style.display=‘none’;
toast(’COLORE: ‘+c.toUpperCase()+’ ’+{red:‘🔴’,blue:‘🔵’,green:‘🟢’,yellow:‘🟡’}[c]);
if (isMP && amHost) broadcast();
afterPlay();
};

// ── SWAP PICKER ──
function showSwapPicker(pIdx) {
const list = document.getElementById(‘swapTargets’);
list.innerHTML = ‘’;
for (let i=0;i<numPlayers;i++) {
if (i===pIdx) continue;
const btn = document.createElement(‘div’);
btn.className=‘swap-opt’;
btn.textContent = names[i]||`BOT ${i}`;
btn.onclick = () => {
[hands[pIdx],hands[i]] = [hands[i],hands[pIdx]];
toast(`HAI SCAMBIATO CON ${names[i]}! 🤝`);
document.getElementById(‘swapPicker’).style.display=‘none’;
currentColor = topCard.color.includes(‘wild’) ? currentColor : topCard.color;
if (isMP && amHost) broadcast();
afterPlay();
};
list.appendChild(btn);
}
document.getElementById(‘swapPicker’).style.display=‘flex’;
}

// ── START ──
function startGame() {
numPlayers = cfg.numPlayers;
gameActive=true; saidUno=false; dir=1; drawStack=0; myIdx=0;
buildDeck(); hands=[]; names=[];
for (let i=0;i<numPlayers;i++) {
hands.push([]);
names.push(i===0 ? myName : (BOT_NAMES[i-1]||`BOT ${i}`));
drawFrom(i, 7);
}
topCard = deck.pop();
let safety = 0;
while (topCard.color.includes(‘wild’) && safety++<30) {
deck.unshift(topCard); topCard=deck.pop();
}
currentColor = topCard.color; turn=0;
showScreen(‘s-game’); render();
if (isMP && amHost && conn)
conn.send({type:‘START’, state:buildState(), remoteIdx:1, names});
if (!isMP && turn!==myIdx) setTimeout(botTurn, 1200);
}

// ── MULTIPLAYER ──
function buildState() {
return {deck,hands,topCard,currentColor,drawStack,turn,dir,numPlayers,cfg};
}
function applyState(s) {
({deck,hands,topCard,currentColor,drawStack,turn,dir,numPlayers,cfg}=s);
}
function broadcast() {
if (conn&&conn.open) conn.send({type:‘STATE’,state:buildState()});
}

function initPeer() {
const id = Math.random().toString(36).substr(2,5).toUpperCase();
peer = new Peer(id);
peer.on(‘open’, id => {
document.getElementById(‘myPeerId’).textContent = id;
document.getElementById(‘lb-status’).textContent = ‘Online! Condividi il tuo codice.’;
});
peer.on(‘connection’, c => {
conn=c; isMP=true; amHost=true;
setupConn();
toast(‘AVVERSARIO CONNESSO! 🎮 Avvio…’);
setTimeout(()=>startGame(), 1500);
});
}

function connectPeer(fid) {
isMP=true; amHost=false;
conn = peer.connect(fid);
setupConn();
}

function setupConn() {
conn.on(‘open’, () => { toast(‘CONNESSO! ✅’); });
conn.on(‘data’, d => {
if (d.type===‘START’) {
myIdx=d.remoteIdx; names=d.names;
applyState(d.state); gameActive=true;
showScreen(‘s-game’); render();
} else if (d.type===‘STATE’) {
applyState(d.state); render();
} else if (d.type===‘CHAT’) {
addMsg(d.sender, d.text, false);
} else if (d.type===‘GAME_OVER’) {
gameActive=false;
setTimeout(()=>showEnd(d.winner===myIdx, d.wName), 600);
}
});
conn.on(‘close’, ()=>{ toast(‘Avversario disconnesso 😢’); gameActive=false; });
}

// ── CHAT ──
function addMsg(sender, text, mine) {
const msgs = document.getElementById(‘chatMsgs’);
const isEmo = /^\p{Emoji}+$/u.test(text.trim());
const d = document.createElement(‘div’);
d.className = `msg ${mine?'mine':'theirs'}${isEmo?' big':''}`;
d.innerHTML = isEmo ? text : `<div class="msg-sender">${sender}</div>${text}`;
msgs.appendChild(d);
msgs.scrollTop = msgs.scrollHeight;
}

window.sendEmoji = function(e) {
addMsg(myName, e, true);
if (conn&&conn.open) conn.send({type:‘CHAT’,sender:myName,text:e});
}

document.getElementById(‘chatSend’).onclick = () => {
const inp = document.getElementById(‘chatInput’);
const t   = inp.value.trim();
if (!t) return;
inp.value=’’;
addMsg(myName, t, true);
if (conn&&conn.open) conn.send({type:‘CHAT’,sender:myName,text:t});
};
document.getElementById(‘chatInput’).onkeydown = e => {
if (e.key===‘Enter’) document.getElementById(‘chatSend’).click();
};

document.getElementById(‘chatBtn’).onclick   = () => toggleChat(true);
document.getElementById(‘chatClose’).onclick = () => toggleChat(false);
function toggleChat(show) {
document.getElementById(‘chatPanel’).style.display = show ? ‘flex’ : ‘none’;
}

// ── END ──
function showEnd(win, wName) {
document.getElementById(‘endIcon’).textContent  = win ? ‘🏆’ : ‘💀’;
const t = document.getElementById(‘endTitle’);
t.className = ’end-title ’+(win?‘win’:‘lose’);
t.textContent = win ? ‘VITTORIA!’ : ‘HAI PERSO!’;
document.getElementById(‘endSub’).textContent = win
? `Complimenti ${myName}! Hai battuto tutti!`
: `${wName||'Qualcuno'} ha vinto. Rivincita?`;
if (win) confetti({particleCount:200,spread:90,origin:{y:.5},zIndex:15000});
showScreen(‘s-end’);
}

// ── SETTINGS ──
function openSettings()  { document.getElementById(‘settingsPanel’).classList.add(‘open’);    document.getElementById(‘spOverlay’).classList.add(‘show’); }
function closeSettings() { document.getElementById(‘settingsPanel’).classList.remove(‘open’); document.getElementById(‘spOverlay’).classList.remove(‘show’); }

document.getElementById(‘settingsBtn’).onclick  = openSettings;
document.getElementById(‘closeSettings’).onclick = closeSettings;
document.getElementById(‘spOverlay’).onclick     = closeSettings;

document.getElementById(‘numPlayersGroup’).querySelectorAll(’.pill’).forEach(btn => {
btn.onclick = () => {
document.querySelectorAll(’.pill’).forEach(b=>b.classList.remove(‘active’));
btn.classList.add(‘active’);
cfg.numPlayers = parseInt(btn.dataset.val);
};
});
document.getElementById(‘rule0’).onchange    = e => cfg.rule0  = e.target.checked;
document.getElementById(‘rule7’).onchange    = e => cfg.rule7  = e.target.checked;
document.getElementById(‘ruleStack’).onchange = e => cfg.stack = e.target.checked;
document.getElementById(‘ruleMulti’).onchange = e => cfg.multi = e.target.checked;

// ── LOGIN ──
function doLogin() {
const name = document.getElementById(‘loginName’).value.trim();
const pass = document.getElementById(‘loginPass’).value;
if (!name || !pass) { toast(‘Inserisci nome e password! ⚠️’); return; }

const accounts = JSON.parse(localStorage.getItem(‘mu_accounts’)||’{}’);
if (accounts[name]) {
if (accounts[name]!==pass) { toast(‘Password errata! ❌’); return; }
toast(`Bentornato, ${name}! 👋`);
} else {
accounts[name] = pass;
localStorage.setItem(‘mu_accounts’, JSON.stringify(accounts));
toast(`Account creato! Benvenuto, ${name}! 🎉`);
}

myName = name.toUpperCase();
document.getElementById(‘lb-tag’).textContent = myName;
showScreen(‘s-lobby’);   // <– this is the fix: direct style.display via showScreen
initPeer();
}

document.getElementById(‘loginBtn’).onclick   = doLogin;
document.getElementById(‘loginPass’).onkeydown = e => { if(e.key===‘Enter’) doLogin(); };
document.getElementById(‘loginName’).onkeydown = e => { if(e.key===‘Enter’) document.getElementById(‘loginPass’).focus(); };

// ── LOBBY ──
document.getElementById(‘copyBtn’).onclick = () => {
const id = document.getElementById(‘myPeerId’).textContent;
navigator.clipboard.writeText(id)
.then(()=>toast(‘📋 Codice copiato! Mandalo al tuo amico.’))
.catch(()=>toast(’ID: ’+id));
};

document.getElementById(‘connectBtn’).onclick = () => {
const id = document.getElementById(‘friendIdInput’).value.trim().toUpperCase();
if (!id) { toast(“Inserisci il codice dell’amico! ⚠️”); return; }
connectPeer(id);
document.getElementById(‘lb-status’).textContent = `Connessione a ${id}...`;
};

document.getElementById(‘playBotBtn’).onclick = () => {
isMP=false; amHost=false; startGame();
};

document.getElementById(‘playAgainBtn’).onclick = () => {
gameActive=false; isMP=false; conn=null; startGame();
};
document.getElementById(‘exitBtn’).onclick = () => location.reload();

// ── INIT: show login screen ──
showScreen(‘s-login’);

}); // end DOMContentLoaded
