const width = 8;
const cellSize = 80;
const gridElement = document.getElementById('grid');
const scoreElement = document.getElementById('score');
const CANDY_TYPES = ['Blue', 'Green', 'Orange', 'Purple', 'Red', 'Yellow'];

let timeLeft = 60;
let timerId;
let board = Array(64).fill(null);
let score = 0;
let firstSelected = null;
let isProcessing = false;

// Charger le record immédiatement depuis le stockage local
let highScore = localStorage.getItem('teslaSweetsHighScore') || 0;

// --- INITIALISATION ---
function init() {
    gridElement.innerHTML = '';
    board = Array(64).fill(null);
    timeLeft = 60;
    score = 0;
    
    // Mise à jour de l'affichage
    scoreElement.innerText = score;
    const highScoreDisplay = document.getElementById('high-score');
    if (highScoreDisplay) highScoreDisplay.innerText = highScore;

    document.getElementById('game-over').style.display = 'none';

    for (let i = 0; i < 64; i++) spawnCandy(i, Math.floor(i / 8) + 8);

    setTimeout(() => {
        checkMatches();
        startTimer();
    }, 600);
}

function startTimer() {
    if (timerId) clearInterval(timerId);
    const timerFill = document.getElementById('timer-fill');
    
    timerId = setInterval(() => {
        timeLeft--;
        let percentage = (timeLeft / 60) * 100;
        timerFill.style.width = percentage + "%";

        if (timeLeft > 30) {
            timerFill.style.backgroundColor = "#00ff88";
            timerFill.style.boxShadow = "0 0 15px #00ff88, 0 0 5px #fff";
        } else if (timeLeft > 10) {
            timerFill.style.backgroundColor = "#ccff00";
            timerFill.style.boxShadow = "0 0 15px #ccff00, 0 0 5px #fff";
        } else {
            timerFill.style.backgroundColor = "#ff0077";
            timerFill.style.boxShadow = "0 0 20px #ff0077, 0 0 10px #fff";
            timerFill.style.opacity = (timeLeft % 2 === 0) ? "1" : "0.7";
        }

        if (timeLeft <= 0) {
            clearInterval(timerId);
            endGame();
        }
    }, 1000);
}

function endGame() {
    isProcessing = true;
    const gameOverScreen = document.getElementById('game-over');
    const finalScoreText = document.getElementById('final-score');
    
    gameOverScreen.style.display = 'flex';
    
    // On récupère le record AVANT la partie pour comparer
    // Note: On utilise une variable temporaire car highScore a déjà été mis à jour pendant le jeu
    let recordToBeat = localStorage.getItem('teslaSweetsHighScore') || 0;
    
    // Si le score actuel est supérieur ou égal au record qu'il y avait au début
    if (score >= recordToBeat && score > 0) {
        finalScoreText.innerHTML = `🚀 NOUVEAU RECORD : ${score} 🚀`;
        finalScoreText.style.color = "#00ff88"; // Vert fluo
        
        launchFireworks(); // Visuel
        playVictorySound(); // Sonore
    } else {
        finalScoreText.innerText = "SCORE FINAL : " + score;
        finalScoreText.style.color = "white";
    }
}

function spawnCandy(index, fallFromRow, type = null, special = '') {
    const existing = gridElement.querySelector(`[data-index="${index}"]`);
    if (existing) existing.remove();

    const col = index % width;
    const row = Math.floor(index / width);
    const candyType = type || CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
    
    const div = document.createElement('div');
    div.className = 'candy';
    div.style.left = (col * cellSize) + 'px';
    div.style.top = (fallFromRow * -cellSize) + 'px';
    div.dataset.index = index;
    
    const img = document.createElement('img');
    let fileName = (special === 'Choco') ? 'Choco.png' : (special ? `${candyType}-${special}.png` : `${candyType}.png`);
    img.src = `assets/${fileName}`;
    img.onerror = () => { 
        div.style.backgroundColor = special === 'Choco' ? 'white' : candyType.toLowerCase(); 
        div.style.borderRadius = "15px"; 
    };

    div.appendChild(img);
    div.onpointerdown = (e) => { 
        e.preventDefault(); 
        if (!isProcessing) handleAction(parseInt(div.dataset.index)); 
    };

    gridElement.appendChild(div);
    board[index] = { el: div, type: candyType, special: special };
    setTimeout(() => { div.style.top = (row * cellSize) + 'px'; }, 50);
}

function handleAction(index) {
    if (firstSelected === null) {
        if (!board[index]) return;
        firstSelected = index;
        board[index].el.classList.add('selected');
    } else {
        const s1 = firstSelected;
        const s2 = index;
        clearSelection();
        if (isAdjacent(s1, s2)) handleMove(s1, s2);
        else { 
            firstSelected = s2; 
            if(board[s2]) board[s2].el.classList.add('selected'); 
        }
    }
}

function isAdjacent(id1, id2) {
    const r1 = Math.floor(id1/8), c1 = id1%8;
    const r2 = Math.floor(id2/8), c2 = id2%8;
    return Math.abs(r1-r2) + Math.abs(c1-c2) === 1;
}

function clearSelection() {
    if (firstSelected !== null && board[firstSelected]) board[firstSelected].el.classList.remove('selected');
    firstSelected = null;
}

function handleMove(id1, id2) {
    if (!board[id1] || !board[id2]) return;
    const c1 = board[id1];
    const c2 = board[id2];
    isProcessing = true;
    swapVisual(id1, id2);

    setTimeout(() => {
        if ((c1.special === 'Choco' && c2.special?.includes('Striped')) || (c2.special === 'Choco' && c1.special?.includes('Striped'))) {
            const targetColor = c1.special === 'Choco' ? c2.type : c1.type;
            transformColorToStriped(targetColor);
            destroyCandy(id1); destroyCandy(id2);
            setTimeout(applyGravity, 800);
        }
        else if (c1.special === 'Choco' && c2.special === 'Choco') {
            board.forEach((_, i) => destroyCandy(i));
            setTimeout(applyGravity, 600);
        }
        else if (c1.special === 'Choco' || c2.special === 'Choco') {
            destroyAllOfColor(c1.special === 'Choco' ? c2.type : c1.type);
            destroyCandy(c1.special === 'Choco' ? id1 : id2);
            setTimeout(applyGravity, 500);
        }
        else if (c1.special && c2.special) {
            triggerCombo(id1, id2);
            setTimeout(applyGravity, 600);
        }
        else if (!checkMatches(id2)) {
            swapVisual(id1, id2);
            isProcessing = false;
        }
    }, 450);
}

function transformColorToStriped(color) {
    board.forEach((c, i) => {
        if (c && c.type === color) {
            const dir = Math.random() > 0.5 ? 'Striped-Horizontal' : 'Striped-Vertical';
            spawnCandy(i, Math.floor(i/8), color, dir);
            setTimeout(() => destroyCandy(i), 300);
        }
    });
}

function triggerCombo(id1, id2) {
    const s1 = board[id1].special; const s2 = board[id2].special;
    const row = Math.floor(id2 / 8); const col = id2 % 8;
    if ((s1.includes('Striped') && s2 === 'Wrapped') || (s1 === 'Wrapped' && s2.includes('Striped'))) {
        for (let i = -1; i <= 1; i++) {
            for (let j = 0; j < 8; j++) {
                if (row + i >= 0 && row + i < 8) destroyCandy((row + i) * 8 + j);
                if (col + i >= 0 && col + i < 8) destroyCandy(j * 8 + (col + i));
            }
        }
    } else if (s1.includes('Striped') && s2.includes('Striped')) {
        for (let i = 0; i < 8; i++) { destroyCandy(row * 8 + i); destroyCandy(i * 8 + col); }
    } else if (s1 === 'Wrapped' && s2 === 'Wrapped') {
        for (let r = row - 2; r <= row + 2; r++) {
            for (let c = col - 2; c <= col + 2; c++) {
                if (r >= 0 && r < 8 && c >= 0 && c < 8) destroyCandy(r * 8 + c);
            }
        }
    }
    destroyCandy(id1); destroyCandy(id2);
}

function swapVisual(id1, id2) {
    const c1 = board[id1]; const c2 = board[id2];
    if(!c1 || !c2) return;
    c1.el.style.left = (id2 % 8 * cellSize) + 'px';
    c1.el.style.top = (Math.floor(id2 / 8) * cellSize) + 'px';
    c2.el.style.left = (id1 % 8 * cellSize) + 'px';
    c2.el.style.top = (Math.floor(id1 / 8) * cellSize) + 'px';
    c1.el.dataset.index = id2; c2.el.dataset.index = id1;
    board[id1] = c2; board[id2] = c1;
}

function destroyCandy(id) {
    if (!board[id]) return;
    const spec = board[id].special;
    const el = board[id].el;
    board[id] = null;
    el.style.transform = "scale(0)";
    setTimeout(() => el.remove(), 250);
    if (spec && spec !== 'Choco') triggerSpecialEffect(id, spec);
}

function triggerSpecialEffect(id, type) {
    const r = Math.floor(id / 8); const c = id % 8;
    if (type === 'Striped-Horizontal') for (let i = 0; i < 8; i++) destroyCandy(r * 8 + i);
    else if (type === 'Striped-Vertical') for (let i = 0; i < 8; i++) destroyCandy(i * 8 + c);
    else if (type === 'Wrapped') {
        for (let i = r-1; i <= r+1; i++) for (let j = c-1; j <= c+1; j++) {
            if (i >= 0 && i < 8 && j >= 0 && j < 8) destroyCandy(i * 8 + j);
        }
    }
}

function destroyAllOfColor(color) {
    board.forEach((c, i) => { if (c && c.type === color) destroyCandy(i); });
}

function checkMatches(lastId = null) {
    let toDestroy = new Set();
    let bonus = null;
    let hMatches = []; let vMatches = [];
    for (let r = 0; r < 8; r++) {
        let count = 1;
        for (let c = 0; c < 8; c++) {
            let i = r * 8 + c;
            if (c < 7 && board[i]?.type && board[i].type !== 'Choco' && board[i].type === board[i+1]?.type) count++;
            else {
                if (count >= 3) {
                    let m = []; for (let k = 0; k < count; k++) m.push(r * 8 + (c - k));
                    hMatches.push({ids: m, type: board[m[0]].type});
                    m.forEach(id => toDestroy.add(id));
                }
                count = 1;
            }
        }
    }
    for (let c = 0; c < 8; c++) {
        let count = 1;
        for (let r = 0; r < 8; r++) {
            let i = r * 8 + c;
            if (r < 7 && board[i]?.type && board[i].type !== 'Choco' && board[i].type === board[i+8]?.type) count++;
            else {
                if (count >= 3) {
                    let m = []; for (let k = 0; k < count; k++) m.push((r - k) * 8 + c);
                    vMatches.push({ids: m, type: board[m[0]].type});
                    m.forEach(id => toDestroy.add(id));
                }
                count = 1;
            }
        }
    }
    hMatches.forEach(h => {
        vMatches.forEach(v => {
            let inter = h.ids.filter(id => v.ids.includes(id));
            if (inter.length > 0 && h.type === v.type) bonus = { id: inter[0], type: h.type, spec: 'Wrapped' };
        });
        if (!bonus && h.ids.length === 4) bonus = { id: (lastId && h.ids.includes(lastId)) ? lastId : h.ids[0], type: h.type, spec: 'Striped-Horizontal' };
        if (!bonus && h.ids.length >= 5) bonus = { id: (lastId && h.ids.includes(lastId)) ? lastId : h.ids[0], type: h.type, spec: 'Choco' };
    });
    vMatches.forEach(v => {
        if (!bonus && v.ids.length === 4) bonus = { id: (lastId && v.ids.includes(lastId)) ? lastId : v.ids[0], type: v.type, spec: 'Striped-Vertical' };
        if (!bonus && v.ids.length >= 5) bonus = { id: (lastId && v.ids.includes(lastId)) ? lastId : v.ids[0], type: v.type, spec: 'Choco' };
    });

    if (toDestroy.size > 0) {
        isProcessing = true;
        toDestroy.forEach(id => { if (id !== bonus?.id) destroyCandy(id); });
        if (bonus) setTimeout(() => spawnCandy(bonus.id, Math.floor(bonus.id/8), bonus.type, bonus.spec), 200);
        
        score += toDestroy.size * 10; 
        scoreElement.innerText = score;

        // Mise à jour du record
        if (score > highScore) {
            highScore = score;
            const hsDisplay = document.getElementById('high-score');
            if (hsDisplay) hsDisplay.innerText = highScore;
            localStorage.setItem('teslaSweetsHighScore', highScore);
        }

        setTimeout(applyGravity, 400);
        return true;
    }
    return false;
}

function applyGravity() {
    for (let c = 0; c < 8; c++) {
        let empty = 0;
        for (let r = 7; r >= 0; r--) {
            let i = r * 8 + c;
            if (board[i] === null) empty++;
            else if (empty > 0) {
                let next = i + (empty * 8);
                board[next] = board[i]; board[next].el.dataset.index = next;
                board[i] = null; board[next].el.style.top = (Math.floor(next / 8) * cellSize) + 'px';
            }
        }
        for (let r = 0; r < empty; r++) spawnCandy(r * 8 + c, r + 1);
    }
    setTimeout(() => { if (!checkMatches()) isProcessing = false; }, 500);
}

window.onload = init;

function launchFireworks() {
    var duration = 5 * 1000; // 5 secondes
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    var interval = setInterval(function() {
      var timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      var particleCount = 50 * (timeLeft / duration);
      // On lance des fusées de gauche et de droite
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}

function playVictorySound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Une petite mélodie ascendante (Do, Mi, Sol, Do octave haut)
    const notes = [261.63, 329.63, 392.00, 523.25]; 
    
    notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle'; // Son doux type "rétro"
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (index * 0.15));
        
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + (index * 0.15));
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (index * 0.15) + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(audioCtx.currentTime + (index * 0.15));
        osc.stop(audioCtx.currentTime + (index * 0.15) + 0.5);
    });
}
