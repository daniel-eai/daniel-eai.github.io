(() => {
  const canvas = document.querySelector('#snake-canvas');
  const scoreEl = document.querySelector('#score');
  const bestScoreEl = document.querySelector('#best-score');
  const statusEl = document.querySelector('#game-status');
  const actionButtons = document.querySelectorAll('.game-button');
  const dpadButtons = document.querySelectorAll('.dpad-button');

  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const STORAGE_KEY = 'daniel-snake-best-score';
  const COLS = 20;
  const ROWS = 15;
  const CELL = 32;
  const TICK_MS = 120;
  const BOARD_W = COLS * CELL;
  const BOARD_H = ROWS * CELL;
  const OPPOSITE = {
    ArrowUp: 'ArrowDown',
    ArrowDown: 'ArrowUp',
    ArrowLeft: 'ArrowRight',
    ArrowRight: 'ArrowLeft',
    w: 's',
    s: 'w',
    a: 'd',
    d: 'a',
  };
  const DIRS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  canvas.width = BOARD_W;
  canvas.height = BOARD_H;

  const state = {
    snake: [],
    food: { x: 10, y: 7 },
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
    bestScore: 0,
    status: 'Ready',
    mode: 'idle',
    lastTime: 0,
    accumulator: 0,
    step: TICK_MS,
  };

  const readBestScore = () => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return Number.isFinite(Number(value)) ? Number(value) : 0;
    } catch {
      return 0;
    }
  };

  const writeBestScore = (value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignore storage failures.
    }
  };

  const updateHud = () => {
    scoreEl.textContent = String(state.score);
    bestScoreEl.textContent = String(state.bestScore);
    statusEl.textContent = state.status;
    statusEl.classList.toggle('game-over', state.mode === 'gameover');
  };

  const resetSnake = () => {
    state.snake = [
      { x: 8, y: 7 },
      { x: 7, y: 7 },
      { x: 6, y: 7 },
    ];
    state.direction = { x: 1, y: 0 };
    state.nextDirection = { x: 1, y: 0 };
    state.food = spawnFood();
  };

  const spawnFood = () => {
    let candidate = { x: 0, y: 0 };
    do {
      candidate = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (state.snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y));
    return candidate;
  };

  const setStatus = (mode, label) => {
    state.mode = mode;
    state.status = label;
    updateHud();
  };

  const startGame = () => {
    if (state.mode === 'running') return;
    if (state.mode === 'gameover' || state.mode === 'idle') {
      state.score = 0;
      resetSnake();
    }
    state.lastTime = 0;
    state.accumulator = 0;
    setStatus('running', 'Running');
  };

  const pauseGame = () => {
    if (state.mode === 'running') {
      setStatus('paused', 'Paused');
    } else if (state.mode === 'paused') {
      setStatus('running', 'Running');
    }
  };

  const restartGame = () => {
    state.score = 0;
    resetSnake();
    state.lastTime = 0;
    state.accumulator = 0;
    setStatus('running', 'Running');
  };

  const gameOver = () => {
    state.mode = 'gameover';
    state.status = 'Game Over';
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      writeBestScore(state.bestScore);
    }
    updateHud();
  };

  const changeDirection = (rawKey) => {
    const key = String(rawKey).toLowerCase();
    const next = DIRS[key] || DIRS[rawKey];
    if (!next) return;

    const current = state.nextDirection;
    if (state.snake.length > 1) {
      const isOpposite =
        current.x + next.x === 0 &&
        current.y + next.y === 0;
      if (isOpposite) return;
    }

    state.nextDirection = next;
    if (state.mode === 'idle') startGame();
  };

  const advance = () => {
    state.direction = state.nextDirection;
    const head = state.snake[0];
    const nextHead = {
      x: head.x + state.direction.x,
      y: head.y + state.direction.y,
    };
    const willGrow = nextHead.x === state.food.x && nextHead.y === state.food.y;
    const bodyToCheck = willGrow ? state.snake : state.snake.slice(0, -1);

    if (
      nextHead.x < 0 ||
      nextHead.x >= COLS ||
      nextHead.y < 0 ||
      nextHead.y >= ROWS ||
      bodyToCheck.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)
    ) {
      gameOver();
      return;
    }

    state.snake.unshift(nextHead);

    if (willGrow) {
      state.score += 10;
      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        writeBestScore(state.bestScore);
      }
      state.food = spawnFood();
    } else {
      state.snake.pop();
    }

    updateHud();
  };

  const drawCell = (x, y, color, glow = false) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
    if (glow) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
      ctx.shadowBlur = 0;
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);

    const bg = ctx.createLinearGradient(0, 0, BOARD_W, BOARD_H);
    bg.addColorStop(0, 'rgba(0, 20, 10, 0.85)');
    bg.addColorStop(1, 'rgba(0, 8, 4, 0.95)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    ctx.strokeStyle = 'rgba(88, 255, 134, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, BOARD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(BOARD_W, y * CELL + 0.5);
      ctx.stroke();
    }

    drawCell(state.food.x, state.food.y, '#ffdf4d', true);
    state.snake.forEach((segment, index) => {
      drawCell(segment.x, segment.y, index === 0 ? '#b7ffce' : '#58ff86', index === 0);
    });

    if (state.mode === 'gameover') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', BOARD_W / 2, BOARD_H / 2 - 10);
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText('Restart to try again', BOARD_W / 2, BOARD_H / 2 + 24);
    }
  };

  const tick = (timestamp) => {
    if (state.lastTime === 0) state.lastTime = timestamp;
    const delta = timestamp - state.lastTime;
    state.lastTime = timestamp;

    if (state.mode === 'running') {
      state.accumulator += delta;
      while (state.accumulator >= state.step && state.mode === 'running') {
        state.accumulator -= state.step;
        advance();
      }
    }

    draw();
    requestAnimationFrame(tick);
  };

  state.bestScore = readBestScore();
  resetSnake();
  updateHud();
  draw();
  requestAnimationFrame(tick);

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'start') startGame();
      if (action === 'pause') pauseGame();
      if (action === 'restart') restartGame();
    });
  });

  dpadButtons.forEach((button) => {
    const direction = button.dataset.direction;
    const handle = (event) => {
      event.preventDefault();
      changeDirection(direction);
    };
    button.addEventListener('pointerdown', handle);
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key;
    if (key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      pauseGame();
      return;
    }
    if (key === 'Enter') {
      event.preventDefault();
      startGame();
      return;
    }
    if (DIRS[key] || DIRS[key.toLowerCase()]) {
      event.preventDefault();
      changeDirection(key);
      return;
    }
    if (key === 'r' || key === 'R') {
      event.preventDefault();
      restartGame();
    }
  });
})();
