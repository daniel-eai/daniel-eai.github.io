"use strict";

(() => {
  const canvas = document.querySelector("#plane-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const scoreEl = document.querySelector("#plane-score"), bossEl = document.querySelector("#plane-boss"), healthEl = document.querySelector("#plane-health"), messageEl = document.querySelector("#plane-message");
  const startButton = document.querySelector("#plane-start"), pauseButton = document.querySelector("#plane-pause"), restartButton = document.querySelector("#plane-restart");
  const W = canvas.width, H = canvas.height, keys = new Set(), stars = Array.from({ length: 100 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3, speed: Math.random() * 25 + 10 }));
  let player, enemies, bullets, enemyBullets, boss, score, health, state = "ready", raf = 0, last = 0, spawnClock = 0, fireClock = 0, invulnerableUntil = 0;
  const setMessage = (title, detail, hidden = false) => { messageEl.querySelector("strong").textContent = title; messageEl.querySelector("span").textContent = detail; messageEl.classList.toggle("hidden", hidden); };
  const updateHealth = () => { healthEl.innerHTML = Array.from({ length: 4 }, (_, i) => `<span class="${i < health ? "" : "empty"}></span>`).join(""); healthEl.setAttribute("aria-label", `비행기 체력 ${health}칸`); };
  const updateHud = () => { scoreEl.textContent = String(score); bossEl.textContent = boss ? `HP ${boss.hp}` : (score >= 10 ? "출현" : "접근 중"); updateHealth(); };
  const reset = () => { player = { x: W / 2, y: H - 54, w: 22, h: 30 }; enemies = []; bullets = []; enemyBullets = []; boss = null; score = 0; health = 4; state = "ready"; spawnClock = 0; fireClock = 0; updateHud(); pauseButton.disabled = true; setMessage("궤도 수호자", "시작 후 스페이스로 적을 공격하세요."); draw(performance.now()); };
  const start = () => { if (state === "running") return; if (state === "gameover" || state === "ready") reset(); state = "running"; setMessage("", "", true); pauseButton.disabled = false; pauseButton.textContent = "일시정지"; last = performance.now(); if (!raf) raf = requestAnimationFrame(frame); };
  const pause = () => { if (state === "running") { state = "paused"; pauseButton.textContent = "계속하기"; setMessage("Paused", "계속하기 버튼을 누르면 이어집니다."); } else if (state === "paused") { state = "running"; setMessage("", "", true); pauseButton.textContent = "일시정지"; last = performance.now(); if (!raf) raf = requestAnimationFrame(frame); } };
  const over = () => { state = "gameover"; pauseButton.disabled = true; setMessage("패배", "재시작 버튼으로 다시 도전하세요."); };
  const fire = () => { if (state !== "running" || fireClock > 0) return; bullets.push({ x: player.x, y: player.y - 20, vx: 0, vy: -430, r: 4 }); fireClock = 170; };
  const damage = () => { const now = performance.now(); if (now < invulnerableUntil) return; health -= 1; invulnerableUntil = now + 1000; updateHud(); if (health <= 0) over(); };
  const hit = (a, b) => Math.abs(a.x - b.x) < (a.w + (b.r || b.w || 10)) * .65 && Math.abs(a.y - b.y) < (a.h + (b.r || b.h || 10)) * .65;
  const spawnEnemy = () => enemies.push({ x: 28 + Math.random() * (W - 56), y: -30, w: 22, h: 22, vx: (Math.random() - .5) * 90, vy: 65 + Math.random() * 55, cooldown: 500 + Math.random() * 900 });
  const spawnBoss = () => { if (!boss && score >= 10) boss = { x: W / 2, y: 70, w: 76, h: 52, hp: 20, vx: 100, cooldown: 350 }; };
  const update = (dt, now) => {
    const speed = 290; let dx = 0, dy = 0; if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1; if (keys.has("ArrowRight") || keys.has("d")) dx += 1; if (keys.has("ArrowUp") || keys.has("w")) dy -= 1; if (keys.has("ArrowDown") || keys.has("s")) dy += 1; const len = Math.hypot(dx, dy) || 1; player.x = Math.max(18, Math.min(W - 18, player.x + dx / len * speed * dt)); player.y = Math.max(25, Math.min(H - 22, player.y + dy / len * speed * dt));
    fireClock -= dt * 1000; if (keys.has(" ")) fire(); spawnClock += dt * 1000; if (spawnClock >= 850) { spawnClock = 0; spawnEnemy(); } spawnBoss();
    bullets.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt; }); enemyBullets.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt; });
    enemies.forEach((e) => { e.x += e.vx * dt; e.y += e.vy * dt; e.cooldown -= dt * 1000; if (e.x < 18 || e.x > W - 18) e.vx *= -1; if (e.cooldown <= 0) { enemyBullets.push({ x: e.x, y: e.y, vx: 0, vy: 150, r: 4 }); e.cooldown = 1100 + Math.random() * 800; } if (hit(player, e)) { e.dead = true; damage(); } });
    if (boss) { boss.x += boss.vx * dt; if (boss.x < 50 || boss.x > W - 50) boss.vx *= -1; boss.cooldown -= dt * 1000; if (boss.cooldown <= 0) { [-80, 0, 80].forEach((vx) => enemyBullets.push({ x: boss.x, y: boss.y + 25, vx, vy: 170, r: 6 })); boss.cooldown = 950; } if (hit(player, boss)) damage(); }
    bullets.forEach((b) => { enemies.forEach((e) => { if (!e.dead && hit(b, e)) { e.dead = true; b.dead = true; score += 1; } }); if (boss && !b.dead && hit(b, boss)) { b.dead = true; boss.hp -= 1; if (boss.hp <= 0) boss = null; } });
    enemyBullets.forEach((b) => { if (hit(player, b)) { b.dead = true; damage(); } }); enemies = enemies.filter((e) => !e.dead && e.y < H + 40); bullets = bullets.filter((b) => !b.dead && b.y > -20); enemyBullets = enemyBullets.filter((b) => !b.dead && b.y < H + 30); updateHud();
  };
  const drawSpace = (now) => { ctx.fillStyle = "#070a1b"; ctx.fillRect(0, 0, W, H); stars.forEach((s) => { const y = (s.y + now / 1000 * s.speed) % H; ctx.fillStyle = "rgba(184,231,255,.75)"; ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, Math.PI * 2); ctx.fill(); }); };
  const drawShip = (x, y, color, scale = 1) => { ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(15, 15); ctx.lineTo(0, 9); ctx.lineTo(-15, 15); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#b8e7ff"; ctx.fillRect(-3, -8, 6, 12); ctx.restore(); };
  const draw = (now) => { drawSpace(now); drawShip(player.x, player.y, performance.now() < invulnerableUntil ? "#fff" : "#65d6ff"); enemies.forEach((e) => drawShip(e.x, e.y, "#d62976", .75)); if (boss) drawShip(boss.x, boss.y, "#f58529", 2.1); bullets.forEach((b) => { ctx.fillStyle = "#8ed7ff"; ctx.fillRect(b.x - 2, b.y - 8, 4, 14); }); enemyBullets.forEach((b) => { ctx.fillStyle = "#ff8fcb"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }); };
  const frame = (now) => { raf = 0; if (state !== "running") return; const dt = Math.min((now - last) / 1000, .05); last = now; update(dt, now); draw(now); if (state === "running") raf = requestAnimationFrame(frame); };
  const directionKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"];
  document.addEventListener("keydown", (event) => { if (directionKeys.includes(event.key) || event.key === " ") { event.preventDefault(); keys.add(event.key); if (state === "ready" || state === "gameover") start(); } });
  document.addEventListener("keyup", (event) => keys.delete(event.key));
  const touchDirectionMap = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
  document.querySelectorAll("[data-plane-direction]").forEach((button) => button.addEventListener("pointerdown", () => { const key = touchDirectionMap[button.dataset.planeDirection]; if (state === "ready" || state === "gameover") start(); keys.add(key); setTimeout(() => keys.delete(key), 140); }));
  document.querySelectorAll("[data-plane-fire]").forEach((button) => button.addEventListener("pointerdown", () => { if (state === "ready" || state === "gameover") start(); fire(); }));
  startButton.addEventListener("click", start); pauseButton.addEventListener("click", pause); restartButton.addEventListener("click", () => { reset(); start(); }); reset();
})();
