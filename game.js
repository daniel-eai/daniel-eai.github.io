(() => {
  const canvas = document.querySelector('#game-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const statusElement = document.querySelector('#game-status');
  const startButton = document.querySelector('#start-game');
  const pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game');
  const touchButtons = document.querySelectorAll('[data-direction]');
  const columns = 24;
  const rows = 16;
  const cellSize = canvas.width / columns;
  const tickRate = 140;
  const enemyMoveRate = 280;
  const enemyCycle = 4000;
  const enemyRespawnDelay = 1000;
  const enemyCount = 4;
  const highScoreKey = 'daniel-eai-worm-high-score';

  let snake;
  let food;
  let direction;
  let nextDirection;
  let enemies;
  let mode = 'ready';
  let score = 0;
  let highScore = Number.parseInt(localStorage.getItem(highScoreKey) || '0', 10);
  let animationFrame = 0;
  let lastTick = 0;
  let lastEnemyMove = 0;
  let enemyCycleStarted = 0;
  let enemyRespawnAt = 0;
  let pausedAt = 0;

  const equals = (a, b) => a.x === b.x && a.y === b.y;
  const randomCell = () => ({ x: Math.floor(Math.random() * columns), y: Math.floor(Math.random() * rows) });
  const isBlocked = (cell) => snake.some((segment) => equals(segment, cell)) || enemies.some((enemy) => enemy.active && equals(enemy, cell));

  const spawnFood = () => {
    let next = randomCell();
    let attempts = 0;
    while (isBlocked(next) && attempts < 500) { next = randomCell(); attempts += 1; }
    return next;
  };

  const spawnEnemies = () => {
    const occupied = [...snake];
    const nextEnemies = [];
    for (let index = 0; index < enemyCount; index += 1) {
      let next = randomCell();
      let attempts = 0;
      while (occupied.some((cell) => equals(cell, next)) && attempts < 500) { next = randomCell(); attempts += 1; }
      nextEnemies.push({ ...next, active: true, exploding: false });
      occupied.push(next);
    }
    return nextEnemies;
  };

  const resetState = () => {
    snake = [{ x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    enemies = spawnEnemies();
    food = spawnFood();
    enemyCycleStarted = performance.now();
    enemyRespawnAt = 0;
    pausedAt = 0;
    updateHud();
    draw();
  };

  const updateHud = () => {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
    statusElement.textContent = mode === 'running' ? 'Running' : mode === 'paused' ? 'Paused' : mode === 'gameover' ? 'Game over' : 'Ready';
    startButton.disabled = mode === 'running';
    pauseButton.disabled = mode !== 'running' && mode !== 'paused';
    pauseButton.textContent = mode === 'paused' ? 'Resume' : 'Pause';
  };

  const setDirection = (name) => {
    const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const candidate = directions[name];
    if (!candidate || (candidate.x === -direction.x && candidate.y === -direction.y)) return;
    nextDirection = candidate;
  };

  const explodeEnemies = (now) => {
    if (enemyRespawnAt || enemies.every((enemy) => enemy.exploding)) return;
    enemies.forEach((enemy) => { enemy.exploding = true; enemy.active = false; });
    enemyRespawnAt = now + enemyRespawnDelay;
  };

  const moveEnemies = () => {
    enemies.forEach((enemy, enemyIndex) => {
      if (!enemy.active || enemy.exploding) return;
      const candidates = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].filter((candidate) => {
        const next = { x: enemy.x + candidate.x, y: enemy.y + candidate.y };
        return next.x >= 0 && next.x < columns && next.y >= 0 && next.y < rows && !snake.some((segment) => equals(segment, next)) && !enemies.some((other, index) => index !== enemyIndex && other.active && equals(other, next));
      });
      if (candidates.length) { const move = candidates[Math.floor(Math.random() * candidates.length)]; enemy.x += move.x; enemy.y += move.y; }
    });
  };

  const step = (now) => {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows;
    const hitSelf = snake.some((segment) => equals(segment, head));
    const hitEnemy = enemies.some((enemy) => enemy.active && equals(enemy, head));
    if (hitWall || hitSelf || hitEnemy) { endGame(); return; }
    snake.unshift(head);
    if (equals(head, food)) {
      score += 10;
      if (score > highScore) { highScore = score; localStorage.setItem(highScoreKey, String(highScore)); }
      food = spawnFood();
    } else snake.pop();
    updateHud();
  };

  const endGame = () => { mode = 'gameover'; window.__activeGame = null; updateHud(); draw(); };

  const drawCell = (cell, color, inset = 2) => { context.fillStyle = color; context.fillRect(cell.x * cellSize + inset, cell.y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2); };

  const draw = () => {
    context.fillStyle = '#06120b'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(114, 255, 180, 0.08)'; context.lineWidth = 1;
    for (let x = 0; x <= columns; x += 1) { context.beginPath(); context.moveTo(x * cellSize, 0); context.lineTo(x * cellSize, canvas.height); context.stroke(); }
    for (let y = 0; y <= rows; y += 1) { context.beginPath(); context.moveTo(0, y * cellSize); context.lineTo(canvas.width, y * cellSize); context.stroke(); }
    drawCell(food, '#ffd58a', 4);
    snake.forEach((segment, index) => drawCell(segment, index === 0 ? '#b2ffd1' : '#42cf87', 2));
    enemies.forEach((enemy) => {
      if (enemy.exploding) { context.strokeStyle = '#ff826c'; context.lineWidth = 3; context.beginPath(); context.arc((enemy.x + 0.5) * cellSize, (enemy.y + 0.5) * cellSize, cellSize * 0.7, 0, Math.PI * 2); context.stroke(); }
      else if (enemy.active) { drawCell(enemy, '#ff826c', 3); context.fillStyle = '#06120b'; context.fillRect(enemy.x * cellSize + cellSize * 0.3, enemy.y * cellSize + cellSize * 0.3, cellSize * 0.14, cellSize * 0.14); }
    });
    if (mode === 'ready' || mode === 'paused' || mode === 'gameover') { context.fillStyle = 'rgba(6, 18, 11, 0.72)'; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = mode === 'gameover' ? '#ff826c' : '#b2ffd1'; context.font = '700 18px sans-serif'; context.textAlign = 'center'; context.fillText(mode === 'gameover' ? 'GAME OVER' : mode === 'paused' ? 'PAUSED' : 'PRESS START', canvas.width / 2, canvas.height / 2); }
  };

  const loop = (now) => {
    if (mode === 'running') {
      if (now - lastTick >= tickRate) { lastTick = now; step(now); }
      if (now - lastEnemyMove >= enemyMoveRate) { lastEnemyMove = now; moveEnemies(); }
      if (now - enemyCycleStarted >= enemyCycle && !enemyRespawnAt) explodeEnemies(now);
      if (enemyRespawnAt && now >= enemyRespawnAt) { enemies = spawnEnemies(); enemyRespawnAt = 0; enemyCycleStarted = now; }
      draw();
    }
    animationFrame = requestAnimationFrame(loop);
  };

  const start = () => { if (mode === 'gameover') resetState(); mode = 'running'; window.__activeGame = 'worm'; lastTick = performance.now(); updateHud(); };
  const togglePause = () => {
    if (mode === 'running') { mode = 'paused'; pausedAt = performance.now(); }
    else if (mode === 'paused') { const shift = performance.now() - pausedAt; enemyCycleStarted += shift; if (enemyRespawnAt) enemyRespawnAt += shift; mode = 'running'; lastTick = performance.now(); }
    updateHud(); draw();
  };
  const restart = () => { resetState(); mode = 'ready'; window.__activeGame = null; updateHud(); };

  document.addEventListener('keydown', (event) => {
    if (window.__activeGame === 'tetris') return;
    const key = (event.key || '').toLowerCase();
    const code = (event.code || '').toLowerCase();
    const keys = { arrowup: 'up', w: 'up', keyw: 'up', arrowdown: 'down', s: 'down', keys: 'down', arrowleft: 'left', a: 'left', keya: 'left', arrowright: 'right', d: 'right', keyd: 'right' };
    const move = keys[key] || keys[code];
    if (move) { event.preventDefault(); setDirection(move); if (mode === 'ready') start(); }
    if ((key === ' ' || code === 'space') && (mode === 'running' || mode === 'paused')) { event.preventDefault(); togglePause(); }
  });
  touchButtons.forEach((button) => button.addEventListener('click', () => { window.__activeGame = 'worm'; setDirection(button.dataset.direction); if (mode === 'ready') start(); }));
  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restart);
  window.addEventListener('pagehide', () => cancelAnimationFrame(animationFrame), { once: true });

  window.__activeGame = null;
  resetState();
  updateHud();
  requestAnimationFrame(loop);
})();
