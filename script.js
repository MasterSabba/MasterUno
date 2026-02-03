// ... (codice iniziale del deck e variabili uguale a prima) ...

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    
    const canStack = (stackCount > 0 && (card.value === topCard.value || card.value === "+4"));
    const normalPlay = (stackCount === 0 && (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")));

    if (canStack || normalPlay) {
        playerHand.splice(i, 1);
        topCard = card;
        
        if (card.value === "draw2") stackCount += 2; 
        else if (card.value === "+4") stackCount += 4;

        if (card.color.includes("wild")) {
            // MOSTRA IL PICKER
            document.getElementById("colorPicker").classList.remove("hidden");
            renderGame(); // Aggiorna per togliere la carta dalla mano
        } else {
            currentColor = card.color;
            checkEnd(card.value === "skip" || card.value === "reverse");
        }
    }
}

// Funzione globale per il click sui cerchi colorati
window.setWildColor = function(c) {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    // Dopo aver scelto il colore, il turno passa o continua se era una carta speciale
    checkEnd(false);
};

function renderGame() {
    // Aggiorna Badge
    document.getElementById("playerBadge").innerText = `TU: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVV: ${opponentHand.length}`;
    
    // ... (restante codice per disegnare le carte in mano uguale a prima) ...

    // Pozzo scarti: svuota e metti solo l'ultima
    const discard = document.getElementById("discardPile");
    const topImg = topCard.color.includes("wild") ? (topCard.value === "+4" ? "wild_draw4" : "wild") : `${topCard.color}_${topCard.value}`;
    discard.innerHTML = `<div class="card ${topCard.color}" style="background-image: url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${topImg}.png')"></div>`;
}
