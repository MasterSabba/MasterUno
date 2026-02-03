// Funzione per mostrare messaggi che spariscono dopo 1.5 secondi
function showToast(text) {
    const toast = document.getElementById("toastNotification");
    toast.innerText = text;
    toast.classList.remove("hidden");
    setTimeout(() => { toast.classList.add("hidden"); }, 1500);
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    const canStack = (stackCount > 0 && card.value === topCard.value);
    const normalPlay = (stackCount === 0 && (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")));

    if (canStack || normalPlay) {
        // Se hai 2 carte e ne giochi una, resti con 1: devi poter dire MasterUno
        // Se ne hai già 1 e la giochi per vincere, il controllo avviene in endTurn
        playerHand.splice(i, 1);
        topCard = card;

        if (card.value === "draw2") stackCount += 2;
        else if (card.value === "+4") stackCount += 4;

        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            let playAgain = (card.value === "skip" || card.value === "reverse");
            endTurn(!playAgain);
        }
    }
}

function endTurn(passTurn) {
    // CONTROLLO VITTORIA E MASTERUNO
    if (playerHand.length === 0) {
        if (!saidMasterUno) {
            showToast("❌ PENALITÀ! Non hai detto MasterUno!");
            drawCard(playerHand, 2);
            isMyTurn = false; // Turno passa per penalità
        } else {
            showEndScreen("player");
            return;
        }
    } else {
        isMyTurn = stackCount > 0 ? false : !passTurn;
    }
    
    // Reset MasterUno se hai più di una carta (es. hai pescato o giocato ma ne hai ancora)
    if (playerHand.length > 1) saidMasterUno = false;

    if (conn) conn.send({ type: "SYNC", topCard, currentColor, stackCount, oppHandSize: playerHand.length, isNextTurn: !isMyTurn });
    renderGame();
    if (!isMyTurn && !conn) setTimeout(botTurn, 1000);
}

// Quando clicchi il tasto MasterUno
document.getElementById("masterUnoBtn").onclick = () => {
    saidMasterUno = true;
    showToast("📢 MASTERUNO!");
    renderGame();
};

function showEndScreen(winner) {
    const screen = document.getElementById("endScreen");
    const msg = document.getElementById("endMessage");
    screen.classList.remove("hidden");
    
    if (winner === "player") {
        msg.innerText = "🏆 HAI VINTO!";
        msg.style.color = "#f1c40f";
        // Effetto coriandoli (richiede la libreria canvas-confetti nell'html)
        if (typeof confetti === "function") {
            confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
        }
    } else {
        msg.innerText = "💀 HAI PERSO!";
        msg.style.color = "#e74c3c";
    }
}

// Correzione Deck: se peschi, non hai detto MasterUno
document.getElementById("deck").onclick = () => {
    if (!isMyTurn) return;
    drawCard(playerHand, stackCount > 0 ? stackCount : 1);
    stackCount = 0; 
    saidMasterUno = false; // Importante: se peschi devi ridirlo
    isMyTurn = false;
    if (conn) conn.send({ type: "SYNC", topCard, currentColor, stackCount, oppHandSize: playerHand.length, isNextTurn: true });
    renderGame();
    if (!conn) setTimeout(botTurn, 1000);
};
