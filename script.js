const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, drawStack = 0;

// Reindirizzamento e Coriandoli
function showEndScreen(win) {
    const screen = document.createElement("div");
    screen.id = "endScreen";
    screen.innerHTML = `<h1 class="end-title">${win ? "HAI VINTO!" : "HAI PERSO!"}</h1>`;
    document.body.appendChild(screen);

    if (win) {
        const duration = 3 * 1000;
        const end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1 } });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
    setTimeout(() => location.reload(), 4000);
}

function getDisplayVal(v) {
    if (v === "draw2") return "+2";
    if (v === "wild4" || v === "+4") return "+4";
    if (v === "skip") return "Ø";
    if (v === "reverse") return "⇄"; // Icona originale
    return v;
}

// ... Resto della logica SYNC, Peer, CreateDeck (uguale a prima con fix +4) ...

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];
    
    // Logica Stacking +4/+2
    if (drawStack > 0 && card.value !== "draw2" && card.value !== "wild4") return;

    if (card.color === currentColor || card.value === topCard.value || card.color.includes("wild")) {
        playerHand.splice(i, 1);
        topCard = card;
        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;
        
        if (card.color.includes("wild")) document.getElementById("colorPicker").classList.remove("hidden");
        else { currentColor = card.color; endTurn(); }
        renderGame();
    }
}

// Inserire qui le funzioni standard createDeck(), startG(), botTurn() inviate nei messaggi precedenti.
