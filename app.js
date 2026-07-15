const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const gameCanvas = document.querySelector('#game-canvas');
const gameBoard = document.querySelector('.game-board');
const gameOverlay = document.querySelector('#game-overlay');
const scoreValue = document.querySelector('#score-value');
const bestValue = document.querySelector('#best-value');
const gameStatus = document.querySelector('#game-status');
const actionButtons = document.querySelectorAll('[data-action]');
const directionButtons = document.querySelectorAll('[data-direction]');

if (navToggle && siteNav) {
  const closeNav = () => {
    siteNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 760px)').matches) {
        closeNav();
      }
    });
  });
}

if (gameCanvas && gameBoard && gameOverlay && scoreValue && bestValue && gameStatus) {
  const ctx = gameCanvas.getContext('2d');
  const GRID_SIZE = 24;
  const TICK_MS = 130;
  const ENEMY_LIFETIME_MS = 5000;
  const ENEMY_RESPAWN_MS = 700;
  const STORAGE_KEY = 'vdyun-snake-best-score';
  const DIR = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const state = {
    snake: [],
    direction: DIR.right,
    queuedDirection: null,
    food: { x: 0, y: 0 },
    score: 0,
    best: loadBestScore(),
    running: false,
    paused: false,
    gameOver: false,
    timerId: null,
    enemy: null,
  };

  function loadBestScore() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return Number.isFinite(Number(stored)) ? Number(stored) : 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignore storage failures in private mode or blocked storage contexts.
    }
  }

  function getBoardSize() {
    return Math.max(240, Math.floor(gameBoard.getBoundingClientRect().width));
  }

  function resizeCanvas() {
    const size = getBoardSize();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    gameCanvas.width = Math.round(size * dpr);
    gameCanvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function samePoint(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function isOnSnake(point) {
    return state.snake.some((segment) => samePoint(segment, point));
  }

  function pointKey(point) {
    return `${point.x}:${point.y}`;
  }

  function randomCell(exclusions = []) {
    const blocked = new Set(exclusions.map(pointKey));
    const candidates = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const point = { x, y };
        if (!blocked.has(pointKey(point))) {
          candidates.push(point);
        }
      }
    }
    if (!candidates.length) {
      return { x: 0, y: 0 };
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function wrapPoint(point) {
    return {
      x: (point.x + GRID_SIZE) % GRID_SIZE,
      y: (point.y + GRID_SIZE) % GRID_SIZE,
    };
  }

  function pickRandomDirection(currentDirection) {
    if (!currentDirection) {
      const allDirections = Object.values(DIR);
      return allDirections[Math.floor(Math.random() * allDirections.length)] || DIR.right;
    }

    const directions = Object.values(DIR).filter((direction) => !isOpposite(direction, currentDirection));
    return directions[Math.floor(Math.random() * directions.length)] || DIR.right;
  }

  function createEnemy() {
    const spawn = randomCell([...state.snake, state.food]);
    return {
      x: spawn.x,
      y: spawn.y,
      direction: pickRandomDirection(null),
      active: true,
      exploding: false,
      lifeMs: 0,
      explodeMs: 0,
    };
  }

  function spawnEnemy() {
    const exclusions = [...state.snake, state.food];
    const spawn = randomCell(exclusions);
    state.enemy = {
      x: spawn.x,
      y: spawn.y,
      direction: pickRandomDirection(state.enemy ? state.enemy.direction : null),
      active: true,
      exploding: false,
      lifeMs: 0,
      explodeMs: 0,
    };
  }

  function startEnemyExplosion() {
    if (!state.enemy) {
      return;
    }
    state.enemy.active = false;
    state.enemy.exploding = true;
    state.enemy.explodeMs = 0;
  }

  function moveEnemy() {
    if (!state.enemy || state.enemy.exploding) {
      return;
    }

    state.enemy.lifeMs += TICK_MS;
    if (state.enemy.lifeMs >= ENEMY_LIFETIME_MS) {
      startEnemyExplosion();
      return;
    }

    if (Math.random() < 0.4) {
      state.enemy.direction = pickRandomDirection(state.enemy.direction);
    }

    const next = wrapPoint({
      x: state.enemy.x + state.enemy.direction.x,
      y: state.enemy.y + state.enemy.direction.y,
    });
    state.enemy.x = next.x;
    state.enemy.y = next.y;

    if (state.snake.some((segment) => samePoint(segment, next))) {
      endGame();
    }
  }

  function updateEnemy() {
    if (!state.enemy) {
      return;
    }

    if (state.enemy.exploding) {
      state.enemy.explodeMs += TICK_MS;
      if (state.enemy.explodeMs >= ENEMY_RESPAWN_MS) {
        spawnEnemy();
      }
      return;
    }

    moveEnemy();
  }

  function updateHud() {
    scoreValue.textContent = String(state.score);
    bestValue.textContent = String(state.best);
    if (state.gameOver) {
      gameStatus.textContent = 'Game Over';
      return;
    }
    if (state.running) {
      gameStatus.textContent = 'Running';
      return;
    }
    if (state.paused) {
      gameStatus.textContent = 'Paused';
      return;
    }
    gameStatus.textContent = 'Ready';
  }

  function setOverlay(title, text, visible) {
    const heading = gameOverlay.querySelector('h3');
    const body = gameOverlay.querySelector('p');
    if (heading) heading.textContent = title;
    if (body) body.textContent = text;
    gameOverlay.classList.toggle('is-visible', visible);
  }

  function showReadyOverlay() {
    setOverlay('Ready to play', 'Press Start or use the keyboard / mobile controls.', true);
  }

  function showPauseOverlay() {
    setOverlay('Paused', 'Resume with Start or use the Pause button again.', true);
  }

  function showGameOverOverlay() {
    setOverlay('Game Over', 'Press Restart to play again.', true);
  }

  function clearTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function resetGameState() {
    clearTimer();
    state.snake = [
      { x: 12, y: 12 },
      { x: 11, y: 12 },
      { x: 10, y: 12 },
    ];
    state.direction = DIR.right;
    state.queuedDirection = null;
    state.food = randomCell(state.snake);
    state.score = 0;
    state.running = false;
    state.paused = false;
    state.gameOver = false;
    state.enemy = createEnemy();
    updateHud();
    showReadyOverlay();
    draw();
  }

  function startGame() {
    if (state.gameOver) {
      resetGameState();
    }
    if (state.running) {
      return;
    }

    clearTimer();
    state.running = true;
    state.paused = false;
    updateHud();
    gameOverlay.classList.remove('is-visible');
    state.timerId = window.setInterval(tick, TICK_MS);
    draw();
  }

  function togglePause() {
    if (state.gameOver) {
      return;
    }
    if (state.running) {
      clearTimer();
      state.running = false;
      state.paused = true;
      updateHud();
      showPauseOverlay();
      draw();
      return;
    }
    if (state.paused) {
      startGame();
      return;
    }
    startGame();
  }

  function restartGame() {
    resetGameState();
    startGame();
  }

  function endGame() {
    clearTimer();
    state.running = false;
    state.paused = false;
    state.gameOver = true;
    if (state.score > state.best) {
      state.best = state.score;
      saveBestScore(state.best);
    }
    updateHud();
    showGameOverOverlay();
    draw();
  }

  function requestDirection(nextDirection) {
    if (state.gameOver) {
      return;
    }

    if (!state.running && !state.paused) {
      state.queuedDirection = nextDirection;
      startGame();
      return;
    }

    const activeDirection = state.queuedDirection || state.direction;
    if (isOpposite(nextDirection, activeDirection)) {
      return;
    }

    state.queuedDirection = nextDirection;
  }

  function moveSnake() {
    if (state.queuedDirection && !isOpposite(state.queuedDirection, state.direction)) {
      state.direction = state.queuedDirection;
    }
    state.queuedDirection = null;

    const head = state.snake[0];
    const nextHead = {
      x: head.x + state.direction.x,
      y: head.y + state.direction.y,
    };
    const willEat = samePoint(nextHead, state.food);
    const bodyToCheck = state.snake.slice(0, willEat ? state.snake.length : state.snake.length - 1);

    const hitsWall =
      nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE;
    const hitsSelf = bodyToCheck.some((segment) => samePoint(segment, nextHead));

    if (hitsWall || hitsSelf) {
      endGame();
      return;
    }

    state.snake.unshift(nextHead);

    if (state.enemy && state.enemy.active && samePoint(nextHead, state.enemy)) {
      endGame();
      return;
    }

    if (willEat) {
      state.score += 1;
      if (state.score > state.best) {
        state.best = state.score;
        saveBestScore(state.best);
      }
      state.food = randomCell([...state.snake, state.enemy ? state.enemy : null].filter(Boolean));
    } else {
      state.snake.pop();
    }

    updateHud();
  }

  function tick() {
    if (!state.running) {
      return;
    }
    moveSnake();
    if (!state.running) {
      return;
    }
    updateEnemy();
    draw();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawBoardBackground(size) {
    ctx.fillStyle = '#0f1720';
    ctx.fillRect(0, 0, size, size);

    const cellSize = size / GRID_SIZE;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i += 1) {
      const offset = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(size, offset);
      ctx.stroke();
    }
  }

  function drawSnake(size) {
    const cellSize = size / GRID_SIZE;
    state.snake.forEach((segment, index) => {
      const padding = cellSize * 0.12;
      const x = segment.x * cellSize + padding / 2;
      const y = segment.y * cellSize + padding / 2;
      const width = cellSize - padding;
      const height = cellSize - padding;

      const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      if (index === 0) {
        gradient.addColorStop(0, '#7de0ff');
        gradient.addColorStop(1, '#2360d8');
      } else {
        gradient.addColorStop(0, '#7ad17f');
        gradient.addColorStop(1, '#2ea44f');
      }

      ctx.fillStyle = gradient;
      roundRect(ctx, x, y, width, height, cellSize * 0.25);
      ctx.fill();

      if (index === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(x + width * 0.62, y + height * 0.35, cellSize * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawFood(size) {
    const cellSize = size / GRID_SIZE;
    const cx = state.food.x * cellSize + cellSize / 2;
    const cy = state.food.y * cellSize + cellSize / 2;
    const radius = cellSize * 0.3;
    const gradient = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, radius * 0.1, cx, cy, radius);
    gradient.addColorStop(0, '#ffd7a6');
    gradient.addColorStop(1, '#ef7d32');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEnemy(size) {
    if (!state.enemy) {
      return;
    }

    const cellSize = size / GRID_SIZE;
    const cx = state.enemy.x * cellSize + cellSize / 2;
    const cy = state.enemy.y * cellSize + cellSize / 2;

    if (state.enemy.exploding) {
      const progress = Math.min(state.enemy.explodeMs / ENEMY_RESPAWN_MS, 1);
      const burstRadius = cellSize * (0.35 + progress * 0.75);
      const burst = ctx.createRadialGradient(cx, cy, cellSize * 0.05, cx, cy, burstRadius);
      burst.addColorStop(0, 'rgba(255, 237, 184, 0.95)');
      burst.addColorStop(0.35, 'rgba(255, 138, 61, 0.95)');
      burst.addColorStop(1, 'rgba(255, 66, 66, 0)');
      ctx.fillStyle = burst;
      ctx.beginPath();
      ctx.arc(cx, cy, burstRadius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const pulse = 0.6 + Math.sin((state.enemy.lifeMs / 180) % Math.PI) * 0.2;
    const radius = cellSize * pulse * 0.42;
    const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
    gradient.addColorStop(0, '#ffdf70');
    gradient.addColorStop(0.45, '#ef7d32');
    gradient.addColorStop(1, '#c5372d');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(cx + radius * 0.18, cy - radius * 0.16, Math.max(1.5, radius * 0.14), 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    if (!ctx) {
      return;
    }
    const size = getBoardSize();
    drawBoardBackground(size);
    drawFood(size);
    drawSnake(size);
    drawEnemy(size);
  }

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'start') {
        startGame();
      }
      if (action === 'pause') {
        togglePause();
      }
      if (action === 'restart') {
        restartGame();
      }
    });
  });

  directionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const direction = button.dataset.direction;
      if (direction && DIR[direction]) {
        requestDirection(DIR[direction]);
      }
    });
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const keyToDirection = {
      arrowup: DIR.up,
      w: DIR.up,
      arrowdown: DIR.down,
      s: DIR.down,
      arrowleft: DIR.left,
      a: DIR.left,
      arrowright: DIR.right,
      d: DIR.right,
    };

    if (keyToDirection[key]) {
      event.preventDefault();
      requestDirection(keyToDirection[key]);
      return;
    }

    if (key === ' ' || key === 'spacebar') {
      event.preventDefault();
      togglePause();
      return;
    }

    if (key === 'enter') {
      event.preventDefault();
      if (state.gameOver) {
        restartGame();
      } else if (!state.running) {
        startGame();
      }
    }
  }, { passive: false });

  window.addEventListener('resize', resizeCanvas);

  resetGameState();
  resizeCanvas();
  updateHud();
}
