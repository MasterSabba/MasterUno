/* ═══════════════════════════════════════════════════════════════
MASTERUNO — BOMBA EDITION  |  script.js
═══════════════════════════════════════════════════════════════ */

// ── CONSTANTS ──────────────────────────────────────────────────
const COLORS = [“red”, “blue”, “green”, “yellow”];
const VALUES = [“0”,“1”,“2”,“3”,“4”,“5”,“6”,“7”,“8”,“9”,“skip”,“reverse”,“draw2”];
const BOT_NAMES = [“🤖 R2-D2”, “🦾 JARVIS”, “👾 MEGA”, “🎮 PIXEL”];

// ── GAME STATE ─────────────────────────────────────────────────
let deck = [], hands = [], playerNames = [], topCard = null, currentColor = “”;
let drawStack = 0, turn = 0, direction = 1, gameActive = false, hasSaidUno = false;
let numPlayers = 2, humanCount = 1; // humanCount: how many are humans (1 or 2 in multiplayer)
let myPlayerIndex = 0; // which index is “me” (local human)

// Settings
let settings = {
rule0: false,
rule7: false,
ruleStack: true,
ruleMulti: false,
numPlayers: 2,
};

// Multiplayer
let peer, conn, isMultiplayer = false, amHost = false;
let myName = “PLAYER”;

// ── LOCAL STORAGE AUTH ─────────────────────────────────────────
function getAccounts() {
return JSON.parse(localStorage.getItem(‘mu_accounts’) || ‘{}’);
}
function saveAccounts(acc) {
localStorage.setItem(‘mu_accounts’, JSON.stringify(acc));
}

// ── SCREEN MANAGER ─────────────────────────────────────────────
function showScreen(id) {
document.querySelectorAll(’.screen’).forEach(s => {
s.classList.remove(‘active’);
s.style.display = ‘’;
});
const el = document.getElementById(id);
el.classList.add(‘active’);
el.style.display = ‘flex’;
}

// ── TOAST ──────────────────────────────────────────────────────
function showToast(msg, duration = 2800) {
const container = document.getElementById(‘toast-container’);
const t = document.createElement(‘div’);
t.className = ‘toast’;
t.innerText = msg;
container.appendChild(t);
setTimeout(() => {
t.style.transition = ‘opacity 0.4s’;
t.style.opacity = ‘0’;
setTimeout(() => t.remove(), 450);
}, duration);
}

// ── DRAW ANIMATION ─────────────────────────────────────────────
function animateCardDraw(fromEl, toEl, cb) {
const anim = document.getElementById(‘drawAnimCard’);
if (!fromEl || !toEl) { if(cb) cb(); return; }
const fromR = fromEl.getBoundingClientRect();
const toR   = toEl.getBoundingClientRect();
anim.style.left = fromR.left + ‘px’;
anim.style.top  = fromR.top  + ‘px’;
anim.style.transform = ‘scale(1)’;
anim.style.opacity = ‘1’;
anim.style.transition = ‘none’;
anim.classList.remove(‘hidden’);

requestAnimationFrame(() => {
requestAnimationFrame(() => {
anim.style.transition = ‘left 0.38s cubic-bezier(0.4,0,0.2,1), top 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.38s’;
anim.style.left = toR.left + ‘px’;
anim.style.top  = toR.top  + ‘px’;
anim.style.opacity = ‘0.2’;
setTimeout(() => {
anim.classList.add(‘hidden’);
if (cb) cb();
}, 400);
});
});
}

// ── DECK ───────────────────────────────────────────────────────
function createDeck() {
deck = [];
COLORS.forEach(c => {
VALUES.forEach(v => {
deck.push({color: c, value: v});
if (v !== “0”) deck.push({color: c, value: v});
});
});
for (let i = 0; i < 4; i++) {
deck.push({color: “wild”,  value: “W”});
deck.push({color: “wild4”, value: “wild4”});
}
shuffle(deck);
}

function shuffle(arr) {
for (let i = arr.length - 1; i > 0; i–) {
const j = Math.floor(Math.random() * (i + 1));
[arr[i], arr[j]] = [arr[j], arr[i]];
}
}

function drawFromDeck(pIdx, qty, animate = false) {
if (deck.length === 0) { createDeck(); }
const deckEl = document.getElementById(‘deck’);
const handEl = pIdx === myPlayerIndex ? document.getElementById(‘playerHand’) : null;

for (let i = 0; i < qty; i++) {
if (deck.length === 0) { createDeck(); }
const card = deck.pop();
hands[pIdx].push(card);
if (animate && pIdx === myPlayerIndex && i === qty - 1 && deckEl && handEl) {
animateCardDraw(deckEl, handEl, () => renderGame());
return;
}
}
}

// ── VALID MOVE ─────────────────────────────────────────────────
function isValidMove(card) {
if (drawStack > 0) {
if (!settings.ruleStack) return false;
if (topCard.value === “draw2”) return card.value === “draw2” || card.value === “wild4”;
if (topCard.value === “wild4”) return card.value === “wild4”;
return false;
}
return card.color === currentColor ||
card.value === topCard.value ||
card.color === “wild” ||
card.color === “wild4”;
}

// ── FORMAT VALUE ───────────────────────────────────────────────
function formatVal(v) {
if (v === “draw2”)   return “+2”;
if (v === “wild4”)   return “+4”;
if (v === “skip”)    return “Ø”;
if (v === “reverse”) return “⇄”;
if (v === “W”)       return “🎨”;
return v;
}

// ── COLOR INDICATOR ────────────────────────────────────────────
function updateColorIndicator() {
const el = document.getElementById(‘colorIndicator’);
if (!topCard) { el.className = ‘color-indicator’; return; }
el.className = `color-indicator visible ${currentColor}`;
}

// ── RENDER GAME ────────────────────────────────────────────────
function renderGame() {
if (!gameActive) return;
renderOpponents();
renderPlayerHand();
renderDiscard();
renderTurnIndicator();
renderMasterUnoBtn();
updateColorIndicator();
}

function renderTurnIndicator() {
const el = document.getElementById(‘turnIndicator’);
const isMyT = (turn === myPlayerIndex);
if (isMyT) {
el.innerText = “🟢 IL TUO TURNO”;
el.className = ‘turn-text my-turn’;
} else {
el.innerText = `🔴 TURNO DI ${playerNames[turn] || 'BOT'}`;
el.className = ‘turn-text’;
}
}

function renderOpponents() {
const area = document.getElementById(‘opponentsArea’);
area.innerHTML = ‘’;
for (let i = 0; i < numPlayers; i++) {
if (i === myPlayerIndex) continue;
const isActive = (turn === i);
const slot = document.createElement(‘div’);
slot.className = `opponent-slot${isActive ? ' active-turn' : ''}`;

```
const name = playerNames[i] || `BOT ${i}`;
const count = hands[i] ? hands[i].length : 0;

// mini cards
const cardsHtml = Array.from({length: Math.min(count, 6)}).map(() =>
  `<div class="mini-card-back"><span>M</span><span>U</span></div>`
).join('') + (isActive ? '<div class="opp-glow"></div>' : '');

slot.innerHTML = `
  <div class="opp-name">${name}</div>
  <div class="opp-cards">${cardsHtml}</div>
  <div class="opp-count">${count} carte</div>
`;
area.appendChild(slot);
```

}
}

function renderPlayerHand() {
const hand = document.getElementById(‘playerHand’);
hand.innerHTML = ‘’;
const myHand = hands[myPlayerIndex] || [];
myHand.forEach((card, idx) => {
const el = document.createElement(‘div’);
const v = formatVal(card.value);
el.className = `card ${card.color}`;
el.setAttribute(‘data-val’, v);
el.innerText = v;
const playable = (turn === myPlayerIndex) && gameActive && isValidMove(card);
if (!playable) el.classList.add(‘unplayable’);
el.onclick = () => playCard(myPlayerIndex, idx);
hand.appendChild(el);
});
document.getElementById(‘playerBadge’).innerText = `TU: ${myHand.length}`;
}

function renderDiscard() {
const discard = document.getElementById(‘discardPile’);
if (!topCard) { discard.innerHTML = ‘’; return; }
const v = formatVal(topCard.value);
discard.innerHTML = `<div class="card ${currentColor}" data-val="${v}" style="pointer-events:none">${v}</div>`;
}

function renderMasterUnoBtn() {
const btn = document.getElementById(‘masterUnoBtn’);
const myHand = hands[myPlayerIndex] || [];
const hasPlayable = myHand.some(c => isValidMove(c));
if (myHand.length === 2 && turn === myPlayerIndex && gameActive && hasPlayable) {
btn.classList.remove(‘hidden’);
} else {
btn.classList.add(‘hidden’);
}
}

// ── PLAY CARD ──────────────────────────────────────────────────
function playCard(pIdx, cIdx) {
if (turn !== pIdx || !gameActive) return;
const hand = hands[pIdx];
const card = hand[cIdx];
if (!isValidMove(card)) return;

// MasterUno penalty check (only for human player)
if (pIdx === myPlayerIndex && hand.length === 2 && !hasSaidUno) {
showToast(“NON HAI DETTO MASTERUNO! +2 🃏”);
drawFromDeck(pIdx, 2);
nextTurn();
return;
}

hand.splice(cIdx, 1);
topCard = card;
hasSaidUno = false;

// Draw stack
if (card.value === “draw2”)   drawStack += 2;
if (card.value === “wild4”)   drawStack += 4;

// Reverse
if (card.value === “reverse”) {
direction *= -1;
if (numPlayers === 2) {
// In 2p, reverse acts as skip
turn = (turn + direction + numPlayers) % numPlayers;
}
}

// Skip
if (card.value === “skip”) {
turn = (turn + direction + numPlayers) % numPlayers;
}

// Rule 0
if (card.value === “0” && settings.rule0) {
showToast(“REGOLA 0: TUTTI SCAMBIANO! 🔄”);
const tmp = […hands.map(h => […h])];
for (let i = 0; i < numPlayers; i++) {
const target = (i + direction + numPlayers) % numPlayers;
hands[target] = tmp[i];
}
}

// Rule 7
if (card.value === “7” && settings.rule7) {
if (pIdx === myPlayerIndex) {
// Show swap picker
renderGame();
showSwapPicker(pIdx);
return; // wait for pick
} else {
// Bot: swap with random other
const others = Array.from({length: numPlayers}, (_, i) => i).filter(i => i !== pIdx);
const target = others[Math.floor(Math.random() * others.length)];
const tmp = hands[pIdx];
hands[pIdx] = hands[target];
hands[target] = tmp;
showToast(`${playerNames[pIdx]} SCAMBIA CON ${playerNames[target]}! 🤝`);
}
}

// Wild
if (card.color === “wild” || card.color === “wild4”) {
if (pIdx === myPlayerIndex) {
renderGame();
document.getElementById(‘colorPicker’).classList.remove(‘hidden’);
return;
} else {
currentColor = COLORS[Math.floor(Math.random() * 4)];
}
} else {
currentColor = card.color;
}

// Multi-card rule: allow playing same-number cards
if (settings.ruleMulti && pIdx === myPlayerIndex) {
renderGame();
const same = hands[pIdx].filter(c => c.value === card.value && !c.color.includes(‘wild’));
if (same.length > 0) {
showToast(“MULTI-CARTA: gioca un altro “ + formatVal(card.value) + “? Clicca o pesca.”);
}
}

if (isMultiplayer && amHost) broadcastState();
finishAction();
}

function showSwapPicker(myIdx) {
const picker = document.getElementById(‘swapPicker’);
const targets = document.getElementById(‘swapTargets’);
targets.innerHTML = ‘’;
for (let i = 0; i < numPlayers; i++) {
if (i === myIdx) continue;
const btn = document.createElement(‘div’);
btn.className = ‘swap-target-btn’;
btn.innerText = playerNames[i] || `BOT ${i}`;
btn.onclick = () => {
const tmp = hands[myIdx];
hands[myIdx] = hands[i];
hands[i] = tmp;
showToast(`HAI SCAMBIATO CON ${playerNames[i]}! 🤝`);
picker.classList.add(‘hidden’);
currentColor = topCard.color.includes(‘wild’) ? currentColor : topCard.color;
if (isMultiplayer && amHost) broadcastState();
finishAction();
};
targets.appendChild(btn);
}
picker.classList.remove(‘hidden’);
}

window.setWildColor = (c) => {
currentColor = c;
document.getElementById(‘colorPicker’).classList.add(‘hidden’);
showToast(“COLORE: “ + c.toUpperCase() + “ “ + {red:‘🔴’,blue:‘🔵’,green:‘🟢’,yellow:‘🟡’}[c]);
if (isMultiplayer && amHost) broadcastState();
finishAction();
};

function finishAction() {
renderGame();

// Check win
for (let i = 0; i < numPlayers; i++) {
if (hands[i].length === 0) {
gameActive = false;
const iWin = (i === myPlayerIndex);
if (isMultiplayer && conn && conn.open) {
conn.send({ type: ‘GAME_OVER’, winnerIdx: i, winnerName: playerNames[i] });
}
setTimeout(() => showEndScreen(iWin, playerNames[i]), 600);
return;
}
}

// Advance turn
turn = (turn + direction + numPlayers) % numPlayers;

if (isMultiplayer && amHost) broadcastState();
renderGame();

// Bot turn?
if (turn !== myPlayerIndex && !isMultiplayer) {
setTimeout(botTurn, 1000 + Math.random() * 500);
}
}

// ── BOT TURN ───────────────────────────────────────────────────
function botTurn() {
if (!gameActive || turn === myPlayerIndex) return;

const hand = hands[turn];
let idx = hand.findIndex(c => isValidMove(c));

if (idx !== -1) {
if (hand.length === 2) showToast(`${playerNames[turn]} dice MASTERUNO! 🔥`);
playCard(turn, idx);
} else {
if (drawStack > 0) {
showToast(`${playerNames[turn]} PESCA ${drawStack} CARTE 🃏`);
drawFromDeck(turn, drawStack);
drawStack = 0;
} else {
drawFromDeck(turn, 1);
}
nextTurn();
}
}

function nextTurn() {
turn = (turn + direction + numPlayers) % numPlayers;
if (isMultiplayer && amHost) broadcastState();
renderGame();
if (turn !== myPlayerIndex && !isMultiplayer) {
setTimeout(botTurn, 1000 + Math.random() * 500);
}
}

// ── DECK CLICK ─────────────────────────────────────────────────
document.getElementById(‘deck’).onclick = () => {
if (turn !== myPlayerIndex || !gameActive) return;
const deckEl = document.getElementById(‘deck’);
const handEl = document.getElementById(‘playerHand’);

if (drawStack > 0) {
showToast(`PESCHI ${drawStack} CARTE 🃏`);
animateCardDraw(deckEl, handEl, () => {
drawFromDeck(myPlayerIndex, drawStack);
drawStack = 0;
if (isMultiplayer && amHost) broadcastState();
nextTurn();
});
} else {
animateCardDraw(deckEl, handEl, () => {
drawFromDeck(myPlayerIndex, 1);
// Check if drawn card is playable
const drawn = hands[myPlayerIndex][hands[myPlayerIndex].length - 1];
if (isValidMove(drawn)) {
showToast(“CARTA PESCATA È GIOCABILE! 🃏”);
}
if (isMultiplayer && amHost) broadcastState();
nextTurn();
});
}
};

// ── MASTERUNO BTN ──────────────────────────────────────────────
document.getElementById(‘masterUnoBtn’).onclick = () => {
hasSaidUno = true;
showToast(“🔥 MASTERUNO!”);
document.getElementById(‘masterUnoBtn’).classList.add(‘hidden’);
};

// ── START GAME ─────────────────────────────────────────────────
function startGame(botGame = true) {
gameActive = true;
createDeck();
hands = [];
playerNames = [];
myPlayerIndex = 0;

// Setup players
numPlayers = settings.numPlayers;
for (let i = 0; i < numPlayers; i++) {
hands.push([]);
if (i === 0) {
playerNames.push(myName);
} else if (isMultiplayer && i === 1) {
playerNames.push(conn ? ‘AVVERSARIO’ : ‘BOT’);
} else {
playerNames.push(BOT_NAMES[i - 1] || `BOT ${i}`);
}
drawFromDeck(i, 7);
}

// First card
topCard = deck.pop();
while (topCard.color.includes(‘wild’)) topCard = deck.pop();
currentColor = topCard.color;

turn = 0;
direction = 1;
drawStack = 0;
hasSaidUno = false;

document.getElementById(‘startScreen’).style.display = ‘none’;
document.getElementById(‘lobbyScreen’).style.display = ‘none’;
showScreen(‘gameArea’);
renderGame();

// Send start to peer if multiplayer host
if (isMultiplayer && amHost && conn) {
conn.send({
type: ‘START’,
state: buildState(),
myIdx: 1, // remote player is index 1
names: playerNames,
});
}

if (!isMultiplayer && turn !== myPlayerIndex) {
setTimeout(botTurn, 1200);
}
}

// ── MULTIPLAYER ────────────────────────────────────────────────
function buildState() {
return { deck, hands, topCard, currentColor, drawStack, turn, direction, numPlayers, settings };
}

function applyState(state) {
deck = state.deck;
hands = state.hands;
topCard = state.topCard;
currentColor = state.currentColor;
drawStack = state.drawStack;
turn = state.turn;
direction = state.direction;
numPlayers = state.numPlayers;
settings = state.settings;
}

function broadcastState() {
if (conn && conn.open) {
conn.send({ type: ‘STATE’, state: buildState() });
}
}

function initPeer() {
const peerId = Math.random().toString(36).substr(2, 5).toUpperCase();
peer = new Peer(peerId);
peer.on(‘open’, id => {
document.getElementById(‘myPeerId’).innerText = id;
document.getElementById(‘lobbyStatus’).innerText = ‘Online! Condividi il tuo codice.’;
});
peer.on(‘connection’, c => {
conn = c;
isMultiplayer = true;
amHost = true;
setupPeerEvents();
document.getElementById(‘lobbyStatus’).innerText = `Connesso! Avvio partita...`;
showToast(“AVVERSARIO CONNESSO! 🎮 Avvio…”);
setTimeout(() => startGame(false), 1500);
});
}

function connectToPeer(friendId) {
isMultiplayer = true;
amHost = false;
conn = peer.connect(friendId);
document.getElementById(‘lobbyStatus’).innerText = ‘Connessione in corso…’;
setupPeerEvents();
}

function setupPeerEvents() {
conn.on(‘open’, () => {
document.getElementById(‘lobbyStatus’).innerText = ‘Connesso!’;
showToast(“CONNESSO! ✅”);
});

conn.on(‘data’, d => {
if (d.type === ‘START’) {
myPlayerIndex = d.myIdx;
playerNames = d.names;
applyState(d.state);
gameActive = true;
showScreen(‘gameArea’);
renderGame();
}
else if (d.type === ‘STATE’) {
applyState(d.state);
renderGame();
}
else if (d.type === ‘CHAT’) {
appendChatMsg(d.sender, d.text, false);
}
else if (d.type === ‘GAME_OVER’) {
gameActive = false;
const iWin = (d.winnerIdx === myPlayerIndex);
setTimeout(() => showEndScreen(iWin, d.winnerName), 600);
}
});

conn.on(‘close’, () => {
showToast(“Avversario disconnesso 😢”);
gameActive = false;
});
}

// ── CHAT ───────────────────────────────────────────────────────
function appendChatMsg(sender, text, isMe) {
const msgs = document.getElementById(‘chatMessages’);
const isEmojiOnly = /^\p{Emoji}+$/u.test(text.trim());
const div = document.createElement(‘div’);
div.className = `chat-msg ${isMe ? 'mine' : 'theirs'}${isEmojiOnly ? ' emoji-only' : ''}`;
if (!isEmojiOnly) {
div.innerHTML = `<div class="msg-sender">${sender}</div>${text}`;
} else {
div.innerText = text;
}
msgs.appendChild(div);
msgs.scrollTop = msgs.scrollHeight;
}

function sendEmoji(emoji) {
appendChatMsg(myName, emoji, true);
if (conn && conn.open) conn.send({ type: ‘CHAT’, sender: myName, text: emoji });
}

document.getElementById(‘chatSendBtn’).onclick = () => {
const input = document.getElementById(‘chatInput’);
const text = input.value.trim();
if (!text) return;
input.value = ‘’;
appendChatMsg(myName, text, true);
if (conn && conn.open) conn.send({ type: ‘CHAT’, sender: myName, text });
};
document.getElementById(‘chatInput’).addEventListener(‘keydown’, e => {
if (e.key === ‘Enter’) document.getElementById(‘chatSendBtn’).click();
});

document.getElementById(‘chatToggleBtn’).onclick = () => toggleChat();
document.getElementById(‘chatCloseBtn’).onclick = () => toggleChat(false);
function toggleChat(force) {
const p = document.getElementById(‘chatPanel’);
const show = force !== undefined ? force : p.classList.contains(‘hidden’);
if (show) { p.classList.remove(‘hidden’); p.style.display = ‘flex’; }
else { p.classList.add(‘hidden’); }
}

// ── END SCREEN ─────────────────────────────────────────────────
function showEndScreen(win, winnerName) {
const title = document.getElementById(‘endTitle’);
const icon  = document.getElementById(‘endIcon’);
const sub   = document.getElementById(‘endSubtitle’);

title.className = ’end-title ’ + (win ? ‘win’ : ‘lose’);
title.innerText = win ? ‘VITTORIA!’ : ‘HAI PERSO!’;
icon.innerText  = win ? ‘🏆’ : ‘💀’;
sub.innerText   = win
? `Complimenti ${myName}! Hai battuto tutti!`
: `${winnerName || 'Qualcuno'} ha vinto. Rivincita?`;

if (win) {
confetti({ particleCount: 180, spread: 80, origin: { y: 0.5 }, zIndex: 15000 });
}

showScreen(‘endScreen’);
}

// ── SETTINGS PANEL ─────────────────────────────────────────────
function openSettings() {
document.getElementById(‘settingsPanel’).classList.add(‘open’);
document.getElementById(‘panelOverlay’).classList.add(‘visible’);
}
function closeSettings() {
document.getElementById(‘settingsPanel’).classList.remove(‘open’);
document.getElementById(‘panelOverlay’).classList.remove(‘visible’);
}

document.getElementById(‘settingsBtn’).onclick = openSettings;
document.getElementById(‘closeSettings’).onclick = closeSettings;
document.getElementById(‘panelOverlay’).onclick = closeSettings;

// Radio pills for num players
document.getElementById(‘numPlayersGroup’).querySelectorAll(’.radio-pill’).forEach(pill => {
pill.onclick = () => {
document.querySelectorAll(’.radio-pill’).forEach(p => p.classList.remove(‘active’));
pill.classList.add(‘active’);
settings.numPlayers = parseInt(pill.querySelector(‘input’).value);
};
});

document.getElementById(‘rule0’).onchange = e => { settings.rule0 = e.target.checked; };
document.getElementById(‘rule7’).onchange = e => { settings.rule7 = e.target.checked; };
document.getElementById(‘ruleStack’).onchange = e => { settings.ruleStack = e.target.checked; };
document.getElementById(‘ruleMulti’).onchange = e => { settings.ruleMulti = e.target.checked; };

// ── LOGIN ──────────────────────────────────────────────────────
document.getElementById(‘loginBtn’).onclick = () => {
const name = document.getElementById(‘loginName’).value.trim();
const pass = document.getElementById(‘loginPass’).value;
if (!name || !pass) { showToast(“Inserisci nome e password! ⚠️”); return; }

const accounts = getAccounts();
if (accounts[name]) {
if (accounts[name] !== pass) { showToast(“Password errata! ❌”); return; }
showToast(`Bentornato, ${name}! 👋`);
} else {
accounts[name] = pass;
saveAccounts(accounts);
showToast(`Account creato! Benvenuto, ${name}! 🎉`);
}

myName = name.toUpperCase();
document.getElementById(‘lobbyPlayerTag’).innerText = myName;
showScreen(‘lobbyScreen’);
initPeer();
};

// Enter key on login
document.getElementById(‘loginPass’).addEventListener(‘keydown’, e => {
if (e.key === ‘Enter’) document.getElementById(‘loginBtn’).click();
});
document.getElementById(‘loginName’).addEventListener(‘keydown’, e => {
if (e.key === ‘Enter’) document.getElementById(‘loginPass’).focus();
});

// ── LOBBY BUTTONS ──────────────────────────────────────────────
document.getElementById(‘copyBtn’).onclick = () => {
const id = document.getElementById(‘myPeerId’).innerText;
navigator.clipboard.writeText(id).then(() => {
showToast(“📋 Codice copiato! Invialo al tuo amico.”);
}).catch(() => {
showToast(“ID: “ + id);
});
};

document.getElementById(‘connectBtn’).onclick = () => {
const id = document.getElementById(‘friendIdInput’).value.trim().toUpperCase();
if (!id) { showToast(“Inserisci l’ID del tuo amico! ⚠️”); return; }
connectToPeer(id);
document.getElementById(‘lobbyStatus’).innerText = `Connessione a ${id}...`;
};

document.getElementById(‘playBotBtn’).onclick = () => {
isMultiplayer = false;
amHost = false;
startGame(true);
};

// ── PLAY AGAIN / EXIT ──────────────────────────────────────────
document.getElementById(‘playAgainBtn’).onclick = () => {
gameActive = false;
isMultiplayer = false;
conn = null;
startGame(true);
};
document.getElementById(‘exitBtn’).onclick = () => {
location.reload();
};

// ── SETTINGS GEAR IN GAME ──────────────────────────────────────
// (re-use same panel from lobby, accessible in-game too if needed)
// The chatToggleBtn is the 💬 icon in topbar

// ── INIT ───────────────────────────────────────────────────────
showScreen(‘loginScreen’);
