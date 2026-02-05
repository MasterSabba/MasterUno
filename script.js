// ... mantieni variabili e createDeck come prima ...

function showEndScreen(win) {
    setTimeout(() => {
        const s = document.getElementById("endScreen");
        const t = document.getElementById("endTitle");
        
        // Escono insieme
        s.classList.remove("hidden");
        t.innerText = win ? "HAI VINTO!" : "HAI PERSO!";
        t.className = "end-title " + (win ? "win-text" : "lose-text");

        if (win) {
            // Esplosione di coriandoli istantanea al menu
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 6000 });
            let end = Date.now() + 4000;
            (function frame() {
                if (gameActive) return; 
                confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 6000 });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 6000 });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    }, 2000); 
}

function botTurn() {
    if (!gameActive) return;
    let idx = opponentHand.findIndex(c => isValidMove(c));
    if (idx !== -1) {
        // IL BOT DICE MASTERUNO SOLO SE GLI RESTA 1 CARTA DOPO QUESTA MOSSA
        if (opponentHand.length === 2) {
            showToast("IL BOT DICE: MASTERUNO! 🔥");
        }
        const card = opponentHand.splice(idx, 1)[0];
        topCard = card;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        currentColor = card.color.includes("wild") ? colors[Math.floor(Math.random()*4)] : card.color;
        finishAction();
    } else {
        if (drawStack > 0) { for(let i=0; i<drawStack; i++) opponentHand.push(deck.pop()); drawStack = 0; }
        else opponentHand.push(deck.pop());
        isMyTurn = true; renderGame();
    }
}

// ... mantieni tutte le altre funzioni invariate ...
