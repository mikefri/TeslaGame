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

// --- INITIALISATION DU JEU ---
function init() {
    gridElement.innerHTML = '';
    board = Array(64).fill(null);
    timeLeft = 60;
    score = 0;
    isProcessing = false;
    
    scoreElement.innerText = score;
    const highScoreDisplay = document.getElementById('high-score');
    if (highScoreDisplay) highScoreDisplay.innerText = highScore;

    document.getElementById('game-over').style.display = 'none';

    // Remplissage initial de la grille
    for (let i = 0; i < 64; i++) spawnCandy(i, Math.floor(i / 8) + 8);

    setTimeout(() => {
        checkMatches();
        startTimer();
    }, 600);
}

// --- GESTION DU TEMPS ---
function startTimer() {
    if (timerId) clearInterval(timerId);
    updateTimerBar();
    
    timerId = setInterval(() => {
        timeLeft--;
        updateTimerBar();

        if (timeLeft <= 0) {
            clearInterval(timerId);
            endGame();
        }
    }, 1000);
}

function updateTimerBar() {
    const timerFill = document.getElementById('timer-fill');
    if (!timerFill) return;
    
    let percentage = (timeLeft / 60) * 100;
    timerFill.style.width = Math.min(Math.max(percentage, 0), 100) + "%";

    if (timeLeft > 30) {
        timerFill.style.backgroundColor = "#00ff88"; // Vert fluo
        timerFill.style.boxShadow = "0 0 15px #00ff88, 0 0 5px #fff";
    } else if (timeLeft > 10) {
        timerFill.style.backgroundColor = "#ccff00"; // Jaune acide
        timerFill.style.boxShadow = "0 0 15px #ccff00, 0 0 5px #fff";
    } else {
        timerFill.style.backgroundColor = "#ff0077"; // Rose bonbon
        timerFill.style.boxShadow = "0 0 20px #ff0077, 0 0 10px #fff";
        timerFill.style.opacity = (timeLeft % 2 === 0) ? "1" : "0.7";
    }
}

// --- LOGIQUE DES BONBONS ---
function spawnCandy(index, fallFromRow, type = null, special = '', isTimeBonus = false) {
    const existing = gridElement.querySelector(`[data-index="${index}"]`);
    if (existing) existing.remove();

    const col = index % width;
    const row = Math.floor(index / width);
    const candyType = type || CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
    
    const div = document.createElement('div');
    div.className = 'candy';
    if (isTimeBonus) div.classList.add('time-bonus');
    
    div.style.left = (col * cellSize) + 'px';
    div.style.top = (fallFromRow * -cellSize) + 'px';
    div.dataset.index = index;
    
    const img = document.createElement('img');
    let fileName = (special === 'Choco') ? 'Choco.png' : (special ? `${candyType}-${special}.png` : `${candyType}.png`);
    img.src = `assets/${fileName}`;
    
    img.onerror = () => { 
        div.style.backgroundColor = special === 'Choco' ? 'white' : candyType.toLowerCase(); 
        div.style.borderRadius = "20px"; 
    };

    if (isTimeBonus) {
        const label = document.createElement('div');
        label.className = 'time-label';
        label.innerText = '+5s';
        div.appendChild(label);
    }

    div.appendChild(img);
    div.onpointerdown = (e) => { 
        e.preventDefault(); 
        if (!isProcessing) handleAction(parseInt(div.dataset.index)); 
    };

    gridElement.appendChild(div);
    board[index] = { el: div, type: candyType, special: special, isTimeBonus: isTimeBonus };
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
    
    // Bonus temps +5s
    if (board[id].isTimeBonus) {
        timeLeft = Math.min(timeLeft + 5, 60);
        updateTimerBar();
        document.getElementById('timer-fill').style.filter = "brightness(2)";
        setTimeout(() => document.getElementById('timer-fill').style.filter = "none", 200);
    }

    const spec = board[id].special;
    const el = board[id].el;
    board[id] = null;
    el.style.transform = "scale(0)";
    setTimeout(() => el.remove(), 250);
    if (spec && spec !== 'Choco') triggerSpecialEffect(id, spec);
}

function checkMatches(lastId = null) {
    let toDestroy = new Set();
    let bonus = null;
    let hMatches = []; let vMatches = [];

    // Horizontal
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
    // Vertical
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

    // Calcul des bonus
    hMatches.forEach(h => {
        vMatches.forEach(v => {
            let inter = h.ids.filter(id => v.ids.includes(id));
            if (inter.length > 0 && h.type === v.type) bonus = { id: inter[0], type: h.type, spec: 'Wrapped' };
        });
        if (!bonus && h.ids.length === 4) bonus = { id: (lastId && h.ids.includes(lastId)) ? lastId : h.ids[0], type: h.type, spec: 'Striped-Horizontal', isTimeBonus: true };
        if (!bonus && h.ids.length >= 5) bonus = { id: (lastId && h.ids.includes(lastId)) ? lastId : h.ids[0], type: h.type, spec: 'Choco' };
    });
    vMatches.forEach(v => {
        if (!bonus && v.ids.length === 4) bonus = { id: (lastId && v.ids.includes(lastId)) ? lastId : v.ids[0], type: v.type, spec: 'Striped-Vertical', isTimeBonus: true };
        if (!bonus && v.ids.length >= 5) bonus = { id: (lastId && v.ids.includes(lastId)) ? lastId : v.ids[0], type: v.type, spec: 'Choco' };
    });

    if (toDestroy.size > 0) {
        isProcessing = true;
        toDestroy.forEach(id => { if (id !== bonus?.id) destroyCandy(id); });
        if (bonus) setTimeout(() => spawnCandy(bonus.id, Math.floor(bonus.id/8), bonus.type, bonus.spec, bonus.isTimeBonus), 200);
        
        score += toDestroy.size * 10; 
        scoreElement.innerText = score;

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

// --- EFFETS SPECIAUX ---
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

function transformColorToStriped(color) {
    board.forEach((c, i) => {
        if (c && c.type === color) {
            const dir = Math.random() > 0.5 ? 'Striped-Horizontal' : 'Striped-Vertical';
            spawnCandy(i, Math.floor(i/8), color, dir);
            setTimeout(() => destroyCandy(i), 300);
        }
    });
}

// --- FIN DE PARTIE & VICTOIRE ---
function endGame() {
    isProcessing = true;
    const gameOverScreen = document.getElementById('game-over');
    const finalScoreText = document.getElementById('final-score');
    gameOverScreen.style.display = 'flex';
    
    let recordToBeat = localStorage.getItem('teslaSweetsHighScore') || 0;
    
    if (score >= recordToBeat && score > 0) {
        finalScoreText.innerHTML = `🚀 NOUVEAU RECORD : ${score} 🚀`;
        finalScoreText.style.color = "#00ff88";
        launchFireworks();
        playVictorySound();
    } else {
        finalScoreText.innerText = "SCORE FINAL : " + score;
        finalScoreText.style.color = "white";
    }
}

function launchFireworks() {
    var duration = 5 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    function randomInRange(min, max) { return Math.random() * (max - min) + min; }

    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        var particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}

function playVictorySound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [261.63, 329.63, 392.00, 523.25]; 
    notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (index * 0.15));
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + (index * 0.15));
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (index * 0.15) + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + (index * 0.15));
        osc.stop(audioCtx.currentTime + (index * 0.15) + 0.5);
    });
}

window.onload = init;
// --- INITIALISATION DES PARTICULES DE FOND (CYBER EFFECT) ---
particlesJS("particles-js", {
    "particles": {
        "number": {
            "value": 80,
            "density": {
                "enable": true,
                "value_area": 800
            }
        },
        "color": {
            "value": "#00ff88" // Couleur de tes particules (vert néon)
        },
        "shape": {
            "type": "circle",
            "stroke": {
                "width": 0,
                "color": "#000000"
            },
            "polygon": {
                "nb_sides": 5
            }
        },
        "opacity": {
            "value": 0.5,
            "random": false,
            "anim": {
                "enable": false,
                "speed": 1,
                "opacity_min": 0.1,
                "sync": false
            }
        },
        "size": {
            "value": 3,
            "random": true,
            "anim": {
                "enable": false,
                "speed": 40,
                "size_min": 0.1,
                "sync": false
            }
        },
        "line_linked": {
            "enable": true,
            "distance": 150,
            "color": "#302b63", // Couleur des liens entre les particules
            "opacity": 0.4,
            "width": 1
        },
        "move": {
            "enable": true,
            "speed": 2, // Vitesse de déplacement des particules
            "direction": "none",
            "random": false,
            "straight": false,
            "out_mode": "out",
            "bounce": false,
            "attract": {
                "enable": false,
                "rotateX": 600,
                "rotateY": 1200
            }
        }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": {
            "onhover": {
                "enable": true,
                "mode": "grab" // Les particules réagissent quand tu passes la souris
            },
            "onclick": {
                "enable": true,
                "mode": "push" // Les particules réagissent quand tu cliques
            },
            "resize": true
        },
        "modes": {
            "grab": {
                "distance": 140,
                "line_linked": {
                    "opacity": 1
                }
            },
            "bubble": {
                "distance": 400,
                "size": 40,
                "duration": 2,
                "opacity": 8,
                "speed": 3
            },
            "repulse": {
                "distance": 200,
                "duration": 0.4
            },
            "push": {
                "particles_nb": 4
            },
            "remove": {
                "particles_nb": 2
            }
        }
    },
    "retina_detect": true
});
