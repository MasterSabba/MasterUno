let peer, myNick, connections = [], players = [];
let gameSettings = { rule07: false, ruleMulti: false, maxPlayers: 4 };
let deck = [], playerHand = [], topCard = null, currentColor = "";
let gameActive = false;

// --- 1. LOGIN CON BLOCCO NICKNAME ---
document.getElementById("loginBtn").addEventListener('click', () => {
    myNick = document.getElementById("nickInput").value.trim();
    
    if (myNick === "") {
        alert("Ehi! Devi inserire un Nickname per giocare!");
        document.getElementById("nickInput").style.border = "2px solid red";
        return;
    }

    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("welcomeText").innerText = "Benvenuto, " + myNick;
    
    initPeer(); // Inizializza PeerJS solo dopo il login
});

// --- 2. PEERJS E CONNESSIONI ---
function initPeer() {
    const safeNick = myNick.replace(/\s+/g, '').toUpperCase();
    peer = new Peer(safeNick + "-" + Math.floor(Math.random()*9999));

    peer.on('open', (id) => {
        document.getElementById("myPeerId").innerText = id;
    });

    peer.on('connection', (conn) => {
        if (players.length >= gameSettings.maxPlayers - 1) {
            conn.on('open', () => conn.send({type: 'ERROR', msg: 'Stanza piena!'}));
            return;
        }
        setupHostListeners(conn);
    });
}

function setupHostListeners(conn) {
    conn.on('open', () => {
        connections.push(conn);
        players.push({ nick: conn.metadata.nick, id: conn.peer, isBot: false });
        updateStatus();
        showToast(conn.metadata.nick + " si è unito!");
        conn.on('data', (data) => handleData(data));
    });
}

// --- 3. PULSANTI MENU (FIXED) ---
document.getElementById("copyBtn").onclick = () => {
    const id = document.getElementById("myPeerId").innerText;
    const helper = document.getElementById("copyHelper");
    helper.value = id;
    helper.select();
    helper.setSelectionRange(0, 99999);
    document.execCommand("copy");
    showToast("ID COPIATO! 📋");
};

document.getElementById("settingsBtn").onclick = () => {
    document.getElementById("settingsModal").classList.remove("hidden");
};

document.getElementById("saveSettings").onclick = () => {
    gameSettings.rule07 = document.getElementById("rule07").checked;
    gameSettings.ruleMulti = document.getElementById("ruleMulti").checked;
    gameSettings.maxPlayers = parseInt(document.getElementById("maxPlayersSelect").value);
    document.getElementById("settingsModal").classList.add("hidden");
    updateStatus();
    showToast("REGOLE AGGIORNATE!");
};

document.getElementById("connectBtn").onclick = () => {
    const hostId = document.getElementById("hostIdInput").value.trim().toUpperCase();
    if (!hostId) return;
    const conn = peer.connect(hostId, { metadata: { nick: myNick } });
    conn.on('open', () => {
        connections.push(conn);
        showToast("CONNESSO ALL'HOST!");
        conn.on('data', (data) => handleData(data));
    });
};

function updateStatus() {
    document.getElementById("statusText").innerText = `Giocatori: ${players.length + 1}/${gameSettings.maxPlayers}`;
}

// --- 4. FUNZIONI DI GIOCO ---
function showToast(m) {
    const t = document.createElement("div"); t.className = "toast"; t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function handleData(d) {
    if (d.type === 'CHAT') renderChat(d);
    if (d.type === 'START') {
        gameSettings = d.settings;
        document.getElementById("startScreen").classList.add("hidden");
        document.getElementById("gameArea").classList.remove("hidden");
    }
}

function sendChat(emoji) {
    const msg = { type: 'CHAT', nick: myNick, content: emoji };
    connections.forEach(c => c.send(msg));
    renderChat(msg);
}

function renderChat(d) {
    const box = document.getElementById("chatMessages");
    box.innerHTML += `<div><strong>${d.nick}:</strong> ${d.content}</div>`;
    box.scrollTop = box.scrollHeight;
}
