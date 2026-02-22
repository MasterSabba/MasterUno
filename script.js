function render() {
    const handDiv = document.getElementById('playerHand');
    const oppDiv = document.getElementById('opponentsArea');
    const discardDiv = document.getElementById('discardPile');
    const turnTxt = document.getElementById('turnIndicator');
    
    // 1. Pulisci tutto prima di ridisegnare
    handDiv.innerHTML = ""; 
    oppDiv.innerHTML = "";

    // 2. Visualizza Avversari (Bot o Umani)
    gameData.players.forEach((p, i) => {
        if (p.id !== myId) {
            const isHisTurn = (gameData.turn === i);
            const oppBox = document.createElement('div');
            oppBox.className = `opp-mini ${isHisTurn ? 'active-p' : ''}`;
            
            // Calcola quante carte ha l'avversario
            const cardCount = gameData.hands[p.id] ? gameData.hands[p.id].length : 7;
            
            oppBox.innerHTML = `
                <div style="font-size:10px">${p.name}</div>
                <div style="font-size:18px">🎴 ${cardCount}</div>
            `;
            oppDiv.appendChild(oppBox);
        }
    });

    // 3. Visualizza la TUA mano
    const myHand = gameData.hands[myId] || [];
    myHand.forEach((card, index) => {
        const cDiv = document.createElement('div');
        // Se è il tuo turno e la carta è giocabile, aggiungi una classe speciale
        const playable = isCardPlayable(card);
        cDiv.className = `card ${card.color} drawing ${playable ? 'playable' : ''}`;
        
        // Simboli speciali
        const displayVal = formatCardValue(card.value);
        cDiv.innerHTML = `<span>${displayVal}</span>`;
        cDiv.setAttribute('data-val', displayVal);
        
        // Click per giocare la carta
        cDiv.onclick = () => playMyCard(index);
        handDiv.appendChild(cDiv);
    });

    // 4. Carta in cima alla pila degli scarti
    if (gameData.topCard) {
        const top = gameData.topCard;
        const displayTop = formatCardValue(top.value);
        discardDiv.innerHTML = `
            <div class="card ${gameData.curColor}" data-val="${displayTop}">
                ${displayTop}
            </div>
        `;
    }

    // 5. Indicatore Turno
    const currentPlayer = gameData.players[gameData.turn];
    if (currentPlayer.id === myId) {
        turnTxt.innerText = "🟢 TOCCA A TE!";
        turnTxt.style.color = "#f1c40f";
    } else {
        turnTxt.innerText = `🔴 TURNO DI ${currentPlayer.name.toUpperCase()}`;
        turnTxt.style.color = "#fff";
    }

    // 6. Badge MasterUno
    const btnUno = document.getElementById('masterUnoBtn');
    if (myHand.length === 2 && currentPlayer.id === myId) {
        btnUno.classList.remove('hidden');
    } else {
        btnUno.classList.add('hidden');
    }
}

// --- FUNZIONI DI SUPPORTO PER IL RENDER ---

function formatCardValue(v) {
    if (v === "skip") return "Ø";
    if (v === "reverse") return "⇄";
    if (v === "draw2") return "+2";
    if (v === "wild") return "🎨";
    return v;
}

function isCardPlayable(card) {
    const isMyTurn = gameData.players[gameData.turn].id === myId;
    if (!isMyTurn) return false;
    
    // Regola base: stesso colore o stesso valore o Jolly
    if (card.color === gameData.curColor || 
        card.value === gameData.topCard.value || 
        card.color === "wild") {
        return true;
    }
    return false;
}

function playMyCard(index) {
    const card = gameData.hands[myId][index];
    if (!isCardPlayable(card)) {
        toast("Mossa non valida!");
        return;
    }

    // Rimuovi carta dalla mano
    gameData.hands[myId].splice(index, 1);
    gameData.topCard = card;
    gameData.curColor = (card.color === "wild") ? "scegli" : card.color;

    if (gameData.curColor === "scegli") {
        document.getElementById('colorPicker').classList.remove('hidden');
    } else {
        finalizeMove();
    }
}

function finalizeMove() {
    // Passa al prossimo giocatore
    gameData.turn = (gameData.turn + gameData.dir + gameData.players.length) % gameData.players.length;
    
    // Se l'host, gestisci il turno del Bot
    if (isHost) {
        broadcast({ type: 'UPDATE', data: gameData });
        checkBotTurn();
    } else {
        broadcast({ type: 'MOVE', data: gameData });
    }
    render();
}
