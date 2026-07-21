(() => {
  const canvas = document.querySelector('#tetris-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const linesElement = document.querySelector('#tetris-lines');
  const highScoreElement = document.querySelector('#tetris-high-score');
  const statusElement = document.querySelector('#tetris-status');
  const startButton = document.querySelector('#start-tetris');
  const pauseButton = document.querySelector('#pause-tetris');
  const restartButton = document.querySelector('#restart-tetris');
  const touchButtons = document.querySelectorAll('[data-tetris-direction]');
  const columns = 10;
  const rows = 20;
  const cellSize = canvas.width / columns;
  const highScoreKey = 'daniel-eai-tetris-high-score';
  const shapes = [
    { cells: [[1, 1, 1, 1]], color: '#72ffb4' },
    { cells: [[1, 1], [1, 1]], color: '#ffd58a' },
    { cells: [[0, 1, 0], [1, 1, 1]], color: '#c6a8ff' },
    { cells: [[1, 0, 0], [1, 1, 1]], color: '#75c9ff' },
    { cells: [[0, 0, 1], [1, 1, 1]], color: '#ff826c' },
    { cells: [[0, 1, 1], [1, 1, 0]], color: '#9affd1' },
    { cells: [[1, 1, 0], [0, 1, 1]], color: '#ffb478' }
  ];

  let board;
  let current;
  let mode = 'ready';
  let lines = 0;
  let score = 0;
  let highScore = Number.parseInt(localStorage.getItem(highScoreKey) || '0', 10);
  let lastDrop = 0;
  let animationFrame = 0;
  let pausedAt = 0;

  const cloneCells = (cells) => cells.map((row) => [...row]);
  const randomPiece = () => {
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    return { cells: cloneCells(shape.cells), color: shape.color, x: Math.floor((columns - shape.cells[0].length) / 2), y: 0 };
  };

  const reset = () => {
    board = Array.from({ length: rows }, () => Array(columns).fill(null));
    current = randomPiece();
    mode = 'ready';
    lines = 0;
    score = 0;
    pausedAt = 0;
    updateHud();
    draw();
  };

  const updateHud = () => {
    linesElement.textContent = String(lines);
    highScoreElement.textContent = String(highScore);
    statusElement.textContent = mode === 'running' ? 'Running' : mode === 'paused' ? 'Paused' : mode === 'gameover' ? 'Game over' : 'Ready';
    startButton.disabled = mode === 'running';
    pauseButton.disabled = mode !== 'running' && mode !== 'paused';
    pauseButton.textContent = mode === 'paused' ? 'Resume' : 'Pause';
  };

  const collides = (piece, offsetX = 0, offsetY = 0, cells = piece.cells) => cells.some((row, rowIndex) => row.some((value, columnIndex) => {
    if (!value) return false;
    const x = piece.x + columnIndex + offsetX;
    const y = piece.y + rowIndex + offsetY;
    return x < 0 || x >= columns || y >= rows || (y >= 0 && board[y][x]);
  }));

  const rotate = (cells) => cells[0].map((_, columnIndex) => cells.map((row) => row[columnIndex]).reverse());

  const move = (offsetX, offsetY) => {
    if (!collides(current, offsetX, offsetY)) { current.x += offsetX; current.y += offsetY; return true; }
    return false;
  };

  const rotateCurrent = () => {
    const rotated = rotate(current.cells);
    if (!collides(current, 0, 0, rotated)) current.cells = rotated;
    else if (!collides(current, -1, 0, rotated)) { current.x -= 1; current.cells = rotated; }
    else if (!collides(current, 1, 0, rotated)) { current.x += 1; current.cells = rotated; }
  };

  const merge = () => current.cells.forEach((row, rowIndex) => row.forEach((value, columnIndex) => { if (value && current.y + rowIndex >= 0) board[current.y + rowIndex][current.x + columnIndex] = current.color; }));

  const clearLines = () => {
    const remaining = board.filter((row) => row.some((cell) => !cell));
    const cleared = rows - remaining.length;
    while (remaining.length < rows) remaining.unshift(Array(columns).fill(null));
    board = remaining;
    if (cleared) {
      lines += cleared;
      score += [0, 100, 300, 500, 800][cleared] * (1 + Math.floor(lines / 10));
      if (score > highScore) { highScore = score; localStorage.setItem(highScoreKey, String(highScore)); }
    }
  };

  const lock = () => {
    merge();
    clearLines();
    current = randomPiece();
    if (collides(current)) endGame();
    updateHud();
  };

  const endGame = () => { mode = 'gameover'; window.__activeGame = null; updateHud(); draw(); };
  const drop = () => { if (!move(0, 1)) lock(); };
  const dropInterval = () => Math.max(140, 720 - Math.floor(lines / 10) * 55);

  const drawBlock = (x, y, color, inset = 1) => { context.fillStyle = color; context.fillRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2); };

  const draw = () => {
    context.fillStyle = '#06120b'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(114, 255, 180, 0.1)'; context.lineWidth = 1;
    for (let x = 0; x <= columns; x += 1) { context.beginPath(); context.moveTo(x * cellSize, 0); context.lineTo(x * cellSize, canvas.height); context.stroke(); }
    for (let y = 0; y <= rows; y += 1) { context.beginPath(); context.moveTo(0, y * cellSize); context.lineTo(canvas.width, y * cellSize); context.stroke(); }
    board.forEach((row, y) => row.forEach((color, x) => { if (color) drawBlock(x, y, color); }));
    current.cells.forEach((row, rowIndex) => row.forEach((value, columnIndex) => { if (value && current.y + rowIndex >= 0) drawBlock(current.x + columnIndex, current.y + rowIndex, current.color); }));
    if (mode === 'ready' || mode === 'paused' || mode === 'gameover') { context.fillStyle = 'rgba(6, 18, 11, 0.72)'; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = mode === 'gameover' ? '#ff826c' : '#b2ffd1'; context.font = '700 16px sans-serif'; context.textAlign = 'center'; context.fillText(mode === 'gameover' ? 'GAME OVER' : mode === 'paused' ? 'PAUSED' : 'PRESS START', canvas.width / 2, canvas.height / 2); }
  };

  const loop = (now) => {
    if (mode === 'running') { if (now - lastDrop >= dropInterval()) { lastDrop = now; drop(); } draw(); }
    animationFrame = requestAnimationFrame(loop);
  };

  const start = () => { if (mode === 'gameover') reset(); mode = 'running'; window.__activeGame = 'tetris'; lastDrop = performance.now(); updateHud(); canvas.focus(); };
  const togglePause = () => {
    if (mode === 'running') { mode = 'paused'; pausedAt = performance.now(); }
    else if (mode === 'paused') { lastDrop += performance.now() - pausedAt; mode = 'running'; }
    updateHud(); draw();
  };
  const restart = () => { reset(); window.__activeGame = null; };
  const handleAction = (action) => {
    if (mode === 'ready') start();
    if (mode !== 'running') return;
    if (action === 'left') move(-1, 0);
    if (action === 'right') move(1, 0);
    if (action === 'down') drop();
    if (action === 'rotate') rotateCurrent();
    draw();
  };

  document.addEventListener('keydown', (event) => {
    if (window.__activeGame !== 'tetris') return;
    const key = (event.key || '').toLowerCase();
    const code = (event.code || '').toLowerCase();
    const actions = { arrowleft: 'left', keya: 'left', arrowright: 'right', keyd: 'right', arrowdown: 'down', keys: 'down', arrowup: 'rotate', keyw: 'rotate' };
    const action = actions[key] || actions[code];
    if (action) { event.preventDefault(); handleAction(action); }
    if ((key === ' ' || key === 'enter') && (mode === 'ready' || mode === 'gameover')) { event.preventDefault(); start(); }
    if ((key === ' ' || code === 'space') && (mode === 'running' || mode === 'paused')) { event.preventDefault(); togglePause(); }
  });
  touchButtons.forEach((button) => button.addEventListener('click', () => { window.__activeGame = 'tetris'; handleAction(button.dataset.tetrisDirection); }));
  canvas.addEventListener('pointerdown', () => { window.__activeGame = 'tetris'; canvas.focus(); });
  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restart);
  window.addEventListener('pagehide', () => cancelAnimationFrame(animationFrame), { once: true });

  reset();
  requestAnimationFrame(loop);
})();
