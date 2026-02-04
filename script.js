const colors = ["red", "blue", "green", "yellow"];
const values = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];
let deck = [], playerHand = [], opponentHand = [], topCard = null, currentColor = "";
let isMyTurn = true, hasSaidUno = false, drawStack = 0;

function getDisplayVal(v) {
    if (v === "draw2") return "+2";
    if (v === "wild4") return "+4";
    if (v === "skip") return "Ø";
    if (v === "reverse") return "⇄";
    return v;
}

function showEndScreen(win) {
    const screen = document.createElement("div");
    screen.id = "endScreen";
    screen.innerHTML = `<h1 class="end-title">${win ? "HAI VINTO!" : "HAI PERSO!"}</h1>`;
    document.body.appendChild(screen);

    if (win) {
        let end = Date.now() + 3000;
        (function frame() {
            confetti({ particleCount: 10, spread: 100, origin: { y: 0.6 } });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    }
    setTimeout(() => location.reload(), 4000);
}

// FIX LOGICA +4 STACKING
function isValidMove(card) {
    if (drawStack > 0) {
        return card.value === "draw2" || card.value === "wild4";
    }
    return card.color === currentColor || card.value === topCard.value || card.color.includes("wild");
}

function playCard(i) {
    if (!isMyTurn) return;
    const card = playerHand[i];

    if (isValidMove(card)) {
        if(playerHand.length === 2 && !hasSaidUno) {
            alert("NON HAI DETTO MASTERUNO! +2");
            playerHand.push(deck.pop(), deck.pop());
            isMyTurn = false; renderGame(); setTimeout(botTurn, 1000); return;
        }

        playerHand.splice(i, 1);
        topCard = card;
        hasSaidUno = false;

        if (card.value === "draw2") drawStack += 2;
        if (card.value === "wild4") drawStack += 4;

        if (card.color.includes("wild")) {
            document.getElementById("colorPicker").classList.remove("hidden");
        } else {
            currentColor = card.color;
            endTurn();
        }
        renderGame();
    }
}

// Inserire qui le restanti funzioni (createDeck, botTurn, initPeer) come prima.
