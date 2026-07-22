"use strict";

(() => {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");
  document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener("click", () => {
    nav?.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }));
  menuToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  const canvas = document.querySelector("#game-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const scoreEl = document.querySelector("#score");
  const highScoreEl = document.querySelector("#high-score");
  const healthEl = document.querySelector("#health");
  const messageEl = document.querySelector("#game-message");
  const startButton = document.querySelector("#start-game");
  const pauseButton = document.querySelector("#pause-game");
  const restartButton = document.querySelector("#restart-game");
  const grid = 20, cols = canvas.width / grid, rows = canvas.height / grid, enemyCount = 5, tickMs = 90;
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.5 + .3, speed: Math.random() * 18 + 8, alpha: Math.random() * .7 + .2 }));
  let worm, previousWorm, direction, queuedDirection, food, enemies, previousEnemies, score, health, highScore, state, animationId, lastFrame, accumulator, explosionAt, explosionUntil, invulnerableUntil;
  let respawnTimers = new Set();
  const readHighScore = () => Number.parseInt(localStorage.getItem("vdy-worm-best") || "0", 10) || 0;
  const randomCell = () => ({ x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) });
  const sameCell = (a, b) => a && b && a.x === b.x && a.y === b.y;
  const setMessage = (title, detail, hidden = false) => { messageEl.querySelector("strong").textContent = title; messageEl.querySelector("span").textContent = detail; messageEl.classList.toggle("hidden", hidden); };
  const updateHealth = () => { healthEl.innerHTML = Array.from({ length: 4 }, (_, i) => `<span class="${i < health ? "" : "empty"}"></span>`).join(""); healthEl.setAttribute("aria-label", `체력 ${health}칸`); };
  const updateScore = () => { scoreEl.textContent = String(score); highScoreEl.textContent = String(highScore); };
  const occupied = (cell) => worm.some((part) => sameCell(part, cell)) || enemies.some((enemy) => enemy.active && sameCell(enemy, cell));
  const newFood = () => { let next = randomCell(), guard = 0; while (occupied(next) && guard++ < 100) next = randomCell(); return next; };
  const newEnemy = () => { let next = randomCell(), guard = 0; while (occupied(next) && guard++ < 100) next = randomCell(); return { ...next, active: true, vx: Math.random() > .5 ? 1 : -1, vy: Math.random() > .5 ? 1 : -1 }; };
  const clearTimers = () => { respawnTimers.forEach(clearTimeout); respawnTimers = new Set(); };
  const reset = () => {
    clearTimers(); worm = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }]; previousWorm = worm.map((p) => ({ ...p })); direction = { x: 1, y: 0 }; queuedDirection = { ...direction }; enemies = []; enemies = Array.from({ length: enemyCount }, newEnemy); previousEnemies = enemies.map((e) => ({ ...e })); score = 0; health = 4; highScore = readHighScore(); state = "ready"; accumulator = 0; explosionAt = performance.now() + 5000; explosionUntil = 0; invulnerableUntil = 0; updateScore(); updateHealth(); pauseButton.disabled = true; setMessage("Ready?", "시작 버튼을 눌러 지렁이를 움직이세요."); draw(1);
  };
  const start = () => { if (state === "running") return; if (state === "gameover" || state === "ready") reset(); state = "running"; setMessage("", "", true); pauseButton.disabled = false; pauseButton.textContent = "일시정지"; lastFrame = performance.now(); if (!animationId) animationId = requestAnimationFrame(frame); };
  const pause = () => { if (state === "running") { state = "paused"; pauseButton.textContent = "계속하기"; setMessage("Paused", "계속하기 버튼을 누르면 이어집니다."); } else if (state === "paused") { state = "running"; setMessage("", "", true); pauseButton.textContent = "일시정지"; lastFrame = performance.now(); if (!animationId) animationId = requestAnimationFrame(frame); } };
  const gameOver = () => { state = "gameover"; pauseButton.disabled = true; if (score > highScore) { highScore = score; localStorage.setItem("vdy-worm-best", String(highScore)); } updateScore(); setMessage("Game over", "재시작 버튼으로 다시 도전하세요."); };
  const queueDirection = (next) => { if (state !== "running") return; if (next.x + direction.x === 0 && next.y + direction.y === 0) return; queuedDirection = { ...next }; };
  const hitEnemy = (enemy) => { enemy.active = false; health -= 1; invulnerableUntil = performance.now() + 1000; updateHealth(); const timer = setTimeout(() => { const index = enemies.indexOf(enemy); if (index >= 0) enemies[index] = newEnemy(); respawnTimers.delete(timer); }, 1000); respawnTimers.add(timer); if (health <= 0) gameOver(); };
  const updateEnemies = () => enemies.forEach((enemy) => { if (!enemy.active) return; if (Math.random() < .45) { const axis = Math.random() > .5 ? "vx" : "vy"; enemy[axis] = Math.random() > .5 ? 1 : -1; } enemy.x += enemy.vx; enemy.y += enemy.vy; if (enemy.x < 0 || enemy.x >= cols) { enemy.vx *= -1; enemy.x = Math.max(0, Math.min(cols - 1, enemy.x)); } if (enemy.y < 0 || enemy.y >= rows) { enemy.vy *= -1; enemy.y = Math.max(0, Math.min(rows - 1, enemy.y)); } });
  const explodeEnemies = () => { explosionUntil = performance.now() + 1000; enemies.forEach((enemy) => { enemy.active = false; }); const timer = setTimeout(() => { enemies = Array.from({ length: enemyCount }, newEnemy); previousEnemies = enemies.map((e) => ({ ...e })); respawnTimers.delete(timer); }, 1000); respawnTimers.add(timer); };
  const update = (now) => { previousWorm = worm.map((p) => ({ ...p })); previousEnemies = enemies.map((e) => ({ ...e })); if (now >= explosionAt && explosionUntil < now) { explodeEnemies(); explosionAt = now + 5000; } if (explosionUntil && now >= explosionUntil) explosionUntil = 0; updateEnemies(); direction = queuedDirection; const head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y }; if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || worm.some((part) => sameCell(part, head))) { gameOver(); return; } worm.unshift(head); if (sameCell(head, food)) { score += 10; if (score > highScore) highScore = score; food = newFood(); updateScore(); } else worm.pop(); const enemy = enemies.find((item) => item.active && sameCell(item, head)); if (enemy && now >= invulnerableUntil) hitEnemy(enemy); };
  const drawSpace = (now) => { ctx.fillStyle = "#070a1b"; ctx.fillRect(0, 0, canvas.width, canvas.height); stars.forEach((star) => { const y = (star.y + now / 1000 * star.speed) % canvas.height; ctx.globalAlpha = star.alpha; ctx.fillStyle = "#b8e7ff"; ctx.beginPath(); ctx.arc(star.x, y, star.r, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(80,120,190,.12)"; for (let x = 0; x < cols; x += 1) for (let y = 0; y < rows; y += 1) ctx.strokeRect(x * grid, y * grid, grid, grid); };
  const drawCell = (cell, color, radius = 3, alpha = 1) => { if (!cell) return; const x = cell.x * grid + 2, y = cell.y * grid + 2; ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, grid - 4, grid - 4, radius); ctx.fill(); ctx.globalAlpha = 1; };
  const draw = (alpha = 1) => { const now = performance.now(); drawSpace(now); drawCell(food, "#f58529", 8); enemies.forEach((enemy, i) => { if (!enemy.active) return; const before = previousEnemies[i] || enemy; drawCell({ x: before.x + (enemy.x - before.x) * alpha, y: before.y + (enemy.y - before.y) * alpha }, explosionUntil ? "#d62976" : "#8a3ab9", 8); }); worm.forEach((part, i) => { const before = previousWorm[i] || part; drawCell({ x: before.x + (part.x - before.x) * alpha, y: before.y + (part.y - before.y) * alpha }, i === 0 ? "#65d6ff" : "#8ed7ff", 7); }); if (explosionUntil) { ctx.fillStyle = `rgba(214,41,118,${.12 + Math.sin(now / 70) * .05})`; ctx.fillRect(0, 0, canvas.width, canvas.height); } };
  const frame = (now) => { animationId = 0; if (state !== "running") return; const delta = Math.min(now - lastFrame, 250); lastFrame = now; accumulator += delta; while (accumulator >= tickMs && state === "running") { update(now); accumulator -= tickMs; } draw(accumulator / tickMs); if (state === "running") animationId = requestAnimationFrame(frame); };
  const keyMap = { ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 } };
  document.addEventListener("keydown", (event) => { const next = keyMap[event.key]; if (next) { event.preventDefault(); if (state === "ready" || state === "gameover") start(); queueDirection(next); } if (event.key === " " && (state === "running" || state === "paused")) { event.preventDefault(); pause(); } });
  const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("pointerdown", () => { if (state === "ready" || state === "gameover") start(); queueDirection(directions[button.dataset.direction]); }));
  startButton.addEventListener("click", start); pauseButton.addEventListener("click", pause); restartButton.addEventListener("click", () => { reset(); start(); }); reset();
})();
