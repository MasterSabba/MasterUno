// --- CONFIGURAZIONE E STATO ---
const SCRS = ['sLogin','sLobby','sGame','sEnd'];
const COLS = ['red','blue','green','yellow'];
const VALS = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];

let deck=[], hands=[], names=[], topCard=null, curCol='';
let stack=0, turn=0, dir=1, active=false, saidUno=false;
let myI=0, np=2;
let myName = 'PLAYER';

// --- SISTEMA SALVATAGGIO AUTOMATICO (LocalStorage) ---
function saveWin() {
    let wins = parseInt(localStorage.getItem('masteruno_wins') || 0);
    wins++;
    localStorage.setItem('masteruno_wins', wins);
    loadWins();
}

function loadWins() {
    const winEl = document.getElementById('localWins');
    if(winEl) winEl.textContent = localStorage.getItem('masteruno_wins') || 0;
}

// --- NAVIGAZIONE ---
function go(id){
    SCRS.forEach(s => document.getElementById(s).style.display = s===id ? 'flex' : 'none');
}

function toast(msg,ms=2800){
    const t=document.createElement('div');
    t.className='toast'; t.textContent=msg;
    document.getElementById('toasts').appendChild(t);
    setTimeout(()=>{
        t.style.opacity='0';
        setTimeout(()=>t.remove(),450);
    },ms);
}

// --- LOGICA GIOCO ---
function buildDeck(){
    deck=[];
    COLS.forEach(c => VALS.forEach(v => {
        deck.push({c,v}); if(v!=='0') deck.push({c,v});
    }));
    for(let i=0;i<4;i++){ deck.push({c:'wild',v:'W'}); deck.push({c:'wild4',v:'wild4'}); }
    deck.sort(() => Math.random() - 0.5);
}

function draw(pi,n){
    for(let i=0;i<n;i++){
        if(!deck.length) buildDeck();
        hands[pi].push(deck.pop());
    }
}

function fmt(v){ return {draw2:'+2', wild4:'+4', skip:'Ø', reverse:'⇄', W:'🎨'}[v] ?? v; }

function render(){
    if(!active) return;
    // Rendering avversari
    const oa = document.getElementById('oppArea'); oa.innerHTML='';
    // Rendering mano giocatore
    const hel = document.getElementById('myHand'); hel.innerHTML='';
    hands[myI].forEach((card, idx) => {
        const el = document.createElement('div');
        el.className = `card ${card.c}`;
        el.textContent = fmt(card.v);
        el.onclick = () => play(myI, idx);
        hel.appendChild(el);
    });
    // Badge e Stato
    document.getElementById('myBadge').textContent = `TU: ${hands[myI].length}`;
}

function play(pi, ci){
    // Logica semplificata per esempio
    const card = hands[pi][ci];
    hands[pi].splice(ci,1);
    topCard = card;
    curCol = card.c === 'wild' ? 'red' : card.c; // Semplificato
    
    if(hands[pi].length === 0){
        active = false;
        if(pi === myI) {
            saveWin();
            confetti();
            showEnd(true);
        } else {
            showEnd(false);
        }
        return;
    }
    render();
}

function showEnd(win){
    go('sEnd');
    document.getElementById('eTitle').textContent = win ? "VITTORIA!" : "SCONFITTA!";
    document.getElementById('eIco').textContent = win ? "🏆" : "💀";
}

// --- EVENTI ---
document.addEventListener('DOMContentLoaded', () => {
    loadWins();
    
    document.getElementById('loginBtn').onclick = () => {
        const n = document.getElementById('lName').value;
        if(n) { myName = n.toUpperCase(); go('sLobby'); }
    };

    document.getElementById('botBtn').onclick = () => {
        active = true;
        hands = [[], []];
        buildDeck();
        draw(0, 7); draw(1, 7);
        go('sGame');
        render();
    };

    document.getElementById('exitBtn').onclick = () => location.reload();
});

// Esposizione funzioni globali per gli onclick HTML
window.pickColor = (c) => { /* logica colore */ };
