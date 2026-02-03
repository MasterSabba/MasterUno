// ... (tutte le variabili iniziali uguali) ...

function renderGame() {
    document.getElementById("turnIndicator").innerText = isMyTurn ? "🟢 TOCCA A TE" : "🔴 TURNO AVVERSARIO";
    document.getElementById("masterUnoBtn").classList.toggle("hidden", !(playerHand.length === 1 && !saidMasterUno));

    // Aggiornamento Badge
    document.getElementById("playerBadge").innerText = `TU: ${playerHand.length}`;
    document.getElementById("opponentBadge").innerText = `AVV: ${opponentHand.length}`;

    const pHand = document.getElementById("playerHand");
    pHand.innerHTML = "";
    playerHand.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = `card ${card.color} clickable`;
        const img = card.color.includes("wild") ? (card.value === "+4" ? "wild_draw4" : "wild") : `${card.color}_${card.value}`;
        div.style.backgroundImage = `url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${img}.png')`;
        div.onclick = () => playCard(i);
        pHand.appendChild(div);
    });

    const oHand = document.getElementById("opponentHand");
    oHand.innerHTML = "";
    opponentHand.forEach(() => { oHand.innerHTML += `<div class="card-back-simple">UNO</div>`; });

    const topImg = topCard.color.includes("wild") ? (topCard.value === "+4" ? "wild_draw4" : "wild") : `${topCard.color}_${topCard.value}`;
    const glow = currentColor === "yellow" ? "#f1c40f" : (currentColor === "blue" ? "#0984e3" : (currentColor === "green" ? "#27ae60" : "#d63031"));
    document.getElementById("discardPile").innerHTML = `<div class="card ${topCard.color}" style="background-image: url('https://raw.githubusercontent.com/IgorZayats/uno/master/assets/cards/${topImg}.png'); border-color: ${glow}; box-shadow: 0 0 20px ${glow}"></div>`;
}

// Assicurati che setWildColor sia globale per l'onclick in HTML
window.setWildColor = (c) => {
    currentColor = c;
    document.getElementById("colorPicker").classList.add("hidden");
    checkEnd(false);
};

// ... (il resto della logica playCard, botTurn, ecc. rimane quella corretta dell'ultima volta)
