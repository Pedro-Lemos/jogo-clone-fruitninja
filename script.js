/**
 * Stack Slicer - Lógica do Jogo
 */

// --- Parâmetros e Configurações ---
const GRAVITY = 0.4;
const TIME_LIMIT_SEC = 60;

// Código Fake para rendering do background tipo IDE
const IDE_CODE = [
    "class StackSlicerEngine {",
    "  constructor(canvasId) {",
    "    this.canvas = document.getElementById(canvasId);",
    "    this.ctx = this.canvas.getContext('2d');",
    "    this.entities = [];",
    "    this.isRunning = false;",
    "    this.lastTime = 0;",
    "  }",
    "",
    "  start() {",
    "    this.isRunning = true;",
    "    this.lastTime = performance.now();",
    "    requestAnimationFrame((t) => this.loop(t));",
    "  }",
    "",
    "  loop(timestamp) {",
    "    if (!this.isRunning) return;",
    "    const dt = timestamp - this.lastTime;",
    "    this.lastTime = timestamp;",
    "",
    "    this.update(dt);",
    "    this.render();",
    "    ",
    "    requestAnimationFrame((t) => this.loop(t));",
    "  }",
    "",
    "  update(dt) {",
    "    for(let i = this.entities.length - 1; i >= 0; i--) {",
    "      const entity = this.entities[i];",
    "      entity.update(dt);",
    "      if (entity.isDead) this.entities.splice(i, 1);",
    "    }",
    "  }",
    "",
    "  render() {",
    "    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);",
    "    this.entities.forEach(entity => entity.draw(this.ctx));",
    "  }",
    "}"
];

// Carregando Assets de Imagem usando URLs CDN (Devicon)
const iconSrc = {
    js: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg',
    java: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg',
    csharp: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg',
    cpp: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg',
    go: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/go/go-original.svg',
    rust: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/rust/rust-original.svg',
    ruby: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ruby/ruby-original.svg',
    python: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg'
};

const images = {};
for (let key in iconSrc) {
    images[key] = new Image();
    images[key].src = iconSrc[key];
}

// Alvos de Linguagens
const LANGUAGES = [
    { id: 'js', img: images.js, color: '#f7df1e', points: 10, label: 'JS' },
    { id: 'java', img: images.java, color: '#f89820', points: 10, label: 'Java' },
    { id: 'csharp', img: images.csharp, color: '#9b4993', points: 10, label: 'C#' },
    { id: 'cpp', img: images.cpp, color: '#00599c', points: 10, label: 'C++' },
    { id: 'go', img: images.go, color: '#00add8', points: 10, label: 'Go' },
    { id: 'rust', img: images.rust, color: '#dea584', points: 10, label: 'Rust' },
    { id: 'ruby', img: images.ruby, color: '#cc342d', points: 10, label: 'Ruby' }
];

const PYTHON_BOMB = { id: 'python', img: images.python, color: '#3776ab', points: 0, isBomb: true, label: 'Python' };

// --- Estado Global ---
let canvas, ctx, fxContainer;
let width, height;
let isPlaying = false;
let isPaused = false;
let score = 0;
let sliceCounts = { js: 0, java: 0, csharp: 0, cpp: 0, go: 0, rust: 0, ruby: 0 };
let timeRemaining = TIME_LIMIT_SEC;
let lastTime = 0;
let timerAccumulator = 0;
let spawnTimer = 0;
let currentSpawnInterval = 2000;
let targets = [];
let particles = [];
let highscore = localStorage.getItem('stackSlicerHighscore') || 0;

// Rastro da lâmina (Mouse/Touch Tracking)
const BLADE_MAX_LENGTH = 10;
let bladePoints = [];
let isSwiping = false;

// --- Elementos do DOM ---
const dom = {};

// --- Utilidades e Matemática ---
const randomRange = (min, max) => Math.random() * (max - min) + min;

// Distância entre ponto e segmento de reta para colisão precisa
function distToSegment(p, v, w) {
    const l2 = dist2(v, w);
    if (l2 == 0) return dist2(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }));
}
function dist2(v, w) { return (v.x - w.x) ** 2 + (v.y - w.y) ** 2; }


// --- Classes ---

class Target {
    constructor() {
        let isBombSpawn = false;

        // Dificuldade progressiva da Bomba: Só aparece se o jogador fez > 50 pontos ou faltam <= 45 segundos
        if (score >= 50 || timeRemaining <= 45) {
            // A probabilidade da bomba varia e fica mais agressiva perto do fim do tempo
            let dangerLevel = 1 - (timeRemaining / TIME_LIMIT_SEC); // 0 a 1
            let bombChance = 0.10 + (dangerLevel * 0.25); // 10% a 35% de chance
            isBombSpawn = Math.random() < bombChance;
        }

        const definition = isBombSpawn ? PYTHON_BOMB : LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];

        this.definition = definition;
        this.radius = 45; // Um pouco maior pois estamos usando as imagens
        this.x = randomRange(this.radius * 2, width - this.radius * 2);
        this.y = height + this.radius;

        // Lançamento com trajetória de parábola
        const centerX = width / 2;
        // Se nascer na esquerda, joga pra direita, e vice-versa
        const direction = this.x < centerX ? 1 : -1;

        // Empurrando para os lados com leve variação
        this.vx = randomRange(1.5, 5) * direction;
        this.vy = randomRange(-28, -22); // Pulo muito mais alto
        this.rotation = Math.random() * Math.PI * 2;
        this.vRotation = randomRange(-0.08, 0.08); // Velocidade de giro

        // Controle de "corte"
        this.isSliced = false;
        this.slicedTime = 0;
        this.halfOffsets = [{ x: 0, y: 0, vx: -3, vy: 0, rot: 0 }, { x: 0, y: 0, vx: 3, vy: 0, rot: 0 }]; // Animação das das metades após cortar
    }

    update(deltaTime) {
        if (!this.isSliced) {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += GRAVITY;
            this.rotation += this.vRotation;
        } else {
            // Se estiver cortado, os pedaços caem e se separam
            this.slicedTime += deltaTime;
            this.vy += GRAVITY * 1.5;

            this.halfOffsets[0].x += this.halfOffsets[0].vx;
            this.halfOffsets[0].y += this.vy;
            this.halfOffsets[0].rot -= 0.05;

            this.halfOffsets[1].x += this.halfOffsets[1].vx;
            this.halfOffsets[1].y += this.vy;
            this.halfOffsets[1].rot += 0.05;
        }
    }

    draw(ctx) {
        ctx.save();

        if (!this.isSliced) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            this.drawShape(ctx);
        } else {
            // Desenha Metade Esquerda com clipping
            ctx.save();
            ctx.translate(this.x + this.halfOffsets[0].x, this.y + this.halfOffsets[0].y);
            ctx.rotate(this.rotation + this.halfOffsets[0].rot);
            ctx.beginPath();
            ctx.rect(-this.radius, -this.radius, this.radius, this.radius * 2);
            ctx.clip();
            this.drawShape(ctx);
            ctx.restore();

            // Desenha Metade Direita com clipping
            ctx.save();
            ctx.translate(this.x + this.halfOffsets[1].x, this.y + this.halfOffsets[1].y);
            ctx.rotate(this.rotation + this.halfOffsets[1].rot);
            ctx.beginPath();
            ctx.rect(0, -this.radius, this.radius, this.radius * 2);
            ctx.clip();
            this.drawShape(ctx);
            ctx.restore();

            // Desenha rastro luminoso onde o corte passou
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = Math.max(0, 1 - (this.slicedTime / 500));
            ctx.beginPath();
            ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    drawShape(ctx) {
        const size = this.radius * 2;

        if (this.definition.img.complete) {
            // Imagem já deu load
            if (this.definition.isBomb) {
                // Brilho mortal atrás do Python
                ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
                ctx.shadowBlur = 20;
            } else {
                // Brilho sutil nas linguagens normais
                ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
                ctx.shadowBlur = 10;
            }

            // Fundo branco no Rust para visibilidade no Dark Mode
            if (this.definition.id === 'rust') {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius - 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Renderiza o SVG Devicon
            ctx.drawImage(this.definition.img, -this.radius, -this.radius, size, size);
            ctx.shadowBlur = 0;

        } else {
            // Fallback caso a imagem não tenha carregado (ou internet falhe)
            ctx.fillStyle = this.definition.color;
            ctx.fillRect(-this.radius, -this.radius, size, size);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.definition.label, 0, 0);
        }
    }

    checkSlice(p1, p2) {
        if (this.isSliced) return false;

        const dist = distToSegment({ x: this.x, y: this.y }, p1, p2);

        if (dist <= this.radius) {
            this.slice();
            return true;
        }
        return false;
    }

    slice() {
        this.isSliced = true;

        if (this.definition.isBomb) {
            endGame("Erro Fatal! Você cortou o Python! 💥");
            return;
        }

        // Aumenta Pontuação e incrementa o HUD
        score += this.definition.points;
        sliceCounts[this.definition.id]++;

        updateHUD();
        updateStatsHUD();
        spawnFloatingText(`+${this.definition.points}`, this.x, this.y, this.definition.color);
        spawnParticles(this.x, this.y, this.definition.color);
    }

    isOutOfBounds() {
        return this.y > height + this.radius * 2 && this.vy > 0;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = randomRange(-6, 6);
        this.vy = randomRange(-6, 6);
        this.color = color;
        this.life = 1.0;
        this.decay = randomRange(0.015, 0.04);

        // Gerando números booleanos de Matrix
        this.text = Math.random() > 0.5 ? '1' : '0';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += GRAVITY * 0.4;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;

        // Efeito Matrix/Neon nas partículas
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;

        ctx.font = '16px monospace';
        ctx.fillText(this.text, this.x, this.y);

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
    }
}

// --- Funções Principais de inicialização e controle ---

function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    fxContainer = document.getElementById('fx-container');

    // Configurar Referências DOM
    dom.startScreen = document.getElementById('start-screen');
    dom.gameOverScreen = document.getElementById('game-over-screen');
    dom.pauseScreen = document.getElementById('pause-screen');
    dom.hud = document.getElementById('hud');
    dom.statsHud = document.getElementById('stats-hud');
    dom.statsList = document.getElementById('stats-list');
    dom.scoreDisplay = document.getElementById('score-display');
    dom.timeDisplay = document.getElementById('time-display');
    dom.startHighscore = document.getElementById('start-highscore');
    dom.gameOverHighscore = document.getElementById('game-over-highscore');
    dom.finalScore = document.getElementById('final-score');
    dom.gameOverTitle = document.getElementById('game-over-title');
    dom.gameOverReason = document.getElementById('game-over-reason');

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', () => { if (isPaused) togglePause(); });

    dom.startHighscore.innerText = highscore;

    resize();
    window.addEventListener('resize', resize);

    setupInput();

    // Inicia a animação mas no modo "Idle" (em menu)
    requestAnimationFrame(gameLoop);
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

function setupInput() {
    const addPoint = (x, y) => {
        if (!isSwiping || !isPlaying) return;
        bladePoints.push({ x, y, time: performance.now() });
        if (bladePoints.length > BLADE_MAX_LENGTH) {
            bladePoints.shift();
        }
        checkCollisions();
    };

    // Suporte ao Mouse
    canvas.addEventListener('mousedown', (e) => { isSwiping = true; bladePoints = []; addPoint(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => { isSwiping = false; bladePoints = []; });
    canvas.addEventListener('mousemove', (e) => addPoint(e.clientX, e.clientY));

    // Suporte ao Touchscreen
    canvas.addEventListener('touchstart', (e) => {
        isSwiping = true;
        bladePoints = [];
        addPoint(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    window.addEventListener('touchend', () => { isSwiping = false; bladePoints = []; });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Impede rolagem (scroll)
        addPoint(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    // Atalho ESC para Pausar
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPlaying) {
            togglePause();
        }
    });
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        dom.pauseScreen.classList.remove('hidden');
    } else {
        dom.pauseScreen.classList.add('hidden');
        lastTime = performance.now(); // Reseta para não dar pulo no timer
    }
}

function startGame() {
    isPlaying = true;
    isPaused = false;
    score = 0;

    // Zera contadores
    for (let key in sliceCounts) {
        sliceCounts[key] = 0;
    }
    updateStatsHUD();

    timeRemaining = TIME_LIMIT_SEC;
    targets = [];
    particles = [];
    bladePoints = [];
    currentSpawnInterval = 2000; // Começa devagar e relaxante
    lastTime = performance.now();
    timerAccumulator = 0;

    updateHUD();

    dom.startScreen.classList.add('hidden');
    dom.gameOverScreen.classList.add('hidden');
    dom.hud.classList.remove('hidden');
    dom.statsHud.classList.remove('hidden');

    // Limpa quaisquer efeitos antigos na tela
    fxContainer.innerHTML = '';
}

function endGame(reason = "O TEMPO ACABOU!") {
    isPlaying = false;

    if (score > highscore) {
        highscore = score;
        localStorage.setItem('stackSlicerHighscore', highscore);
    }

    dom.startScreen.classList.add('hidden');
    dom.hud.classList.add('hidden');
    dom.statsHud.classList.add('hidden');
    dom.gameOverScreen.classList.remove('hidden');

    dom.gameOverReason.innerText = reason;
    dom.gameOverTitle.innerText = reason.includes("Python") ? "ERRO FATAL" : "TEMPO ESGOTADO";
    dom.gameOverTitle.className = reason.includes("Python") ? "title danger-text" : "title neon-text";

    dom.finalScore.innerText = score;
    dom.gameOverHighscore.innerText = highscore;
}

function updateHUD() {
    dom.scoreDisplay.innerText = score;
    dom.timeDisplay.innerText = Math.max(0, Math.floor(timeRemaining));

    if (timeRemaining <= 10) {
        dom.timeDisplay.classList.replace('neon-text', 'danger-text');
    } else {
        dom.timeDisplay.classList.replace('danger-text', 'neon-text');
    }
}

function updateStatsHUD() {
    dom.statsList.innerHTML = '';
    for (let target of LANGUAGES) {
        if (sliceCounts[target.id] > 0) {
            const li = document.createElement('li');

            const imgStyle = target.id === 'rust' ? 'background: white; border-radius: 50%; padding: 2px;' : '';

            li.innerHTML = `
                <img src="${iconSrc[target.id]}" style="${imgStyle}" alt="${target.label}">
                <span>${target.label}: <strong class="neon-text">${sliceCounts[target.id]}</strong></span>
            `;
            dom.statsList.appendChild(li);
        }
    }
}

function spawnFloatingText(text, x, y, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    el.innerText = text;
    fxContainer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function checkCollisions() {
    if (bladePoints.length < 2) return;

    const p1 = bladePoints[bladePoints.length - 2];
    const p2 = bladePoints[bladePoints.length - 1];

    for (let target of targets) {
        target.checkSlice(p1, p2);
    }
}

function drawBlade(ctx) {
    if (bladePoints.length < 2) return;

    const now = performance.now();
    // Filtra pontos antigos para diminuir a cauda se pararmos de deslizar
    bladePoints = bladePoints.filter(p => now - p.time < 120);

    if (bladePoints.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(bladePoints[0].x, bladePoints[0].y);
    for (let i = 1; i < bladePoints.length; i++) {
        ctx.lineTo(bladePoints[i].x, bladePoints[i].y);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Efeito de brilho externo e sombra (Blade Aura)
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Núcleo da Lâmina
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 9;
    ctx.stroke();
}

// --- Loop Principal e Renderização (60 frames por segundo) ---

function gameLoop(timestamp) {
    // Escalonando para a próxima render frame
    requestAnimationFrame(gameLoop);

    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Limpar o Canvas
    ctx.clearRect(0, 0, width, height);

    // Fundo simulando uma IDE (VS Code)
    ctx.font = '16px "Fira Code", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let startY = 40;
    for (let i = 0; i < IDE_CODE.length; i++) {
        let yPos = startY + (i * 24);
        if (yPos > height) break;

        // Numero da linha
        ctx.fillStyle = '#858585';
        ctx.fillText((i + 1).toString(), 20, yPos);

        // Texto do código formatado
        ctx.fillStyle = 'rgba(212, 212, 212, 0.2)';
        ctx.fillText(IDE_CODE[i], 60, yPos);
    }

    if (!isPlaying) return;

    if (!isPaused) {
        // Lógica do Temporizador da Partida
        timerAccumulator += deltaTime;
        if (timerAccumulator >= 1000) {
            timeRemaining--;
            updateHUD();
            timerAccumulator -= 1000;

            // Progressão da Dificuldade baseada no tempo
            let progress = 1 - (Math.max(0, timeRemaining) / TIME_LIMIT_SEC);
            currentSpawnInterval = Math.max(500, 2000 - (progress * 1500));

            if (timeRemaining <= 0) {
                endGame();
                return;
            }
        }

        // Lógica do Spawner Progressivo
        spawnTimer += deltaTime;
        if (spawnTimer > currentSpawnInterval) {
            spawnTimer = 0;

            let maxSpawns = 1;

            if (timeRemaining < 45 || score > 40) maxSpawns = 2;
            if (timeRemaining < 30 || score > 150) maxSpawns = 3;
            if (timeRemaining < 10 && score > 300) maxSpawns = 4;

            const count = Math.floor(randomRange(1, maxSpawns + 1));

            for (let i = 0; i < count; i++) {
                setTimeout(() => { if (!isPaused) targets.push(new Target()) }, i * 250);
            }
        }

        // Atualizar Partículas (Fx)
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update();
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Atualizar Targets (Linguagens e Bombas)
        for (let i = targets.length - 1; i >= 0; i--) {
            const target = targets[i];
            target.update(deltaTime);
            if (target.isOutOfBounds()) {
                targets.splice(i, 1);
            }
        }
    }

    // Renderizações (Desenhos) - Ocorrem mesmo pausados
    for (let p of particles) p.draw(ctx);
    for (let t of targets) t.draw(ctx);
    if (!isPaused) drawBlade(ctx);
}

// Iniciar Motor assim que o DOM carregar
window.onload = init;
