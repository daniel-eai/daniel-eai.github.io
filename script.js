const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const matrixCanvas = document.querySelector('.matrix-rain');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

if (matrixCanvas instanceof HTMLCanvasElement) {
  const ctx = matrixCanvas.getContext('2d');
  const chars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*';
  let columns = [];
  let drops = [];
  let width = 0;
  let height = 0;
  let frame = 0;

  const resize = () => {
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    matrixCanvas.width = Math.floor(width * ratio);
    matrixCanvas.height = Math.floor(height * ratio);
    matrixCanvas.style.width = `${width}px`;
    matrixCanvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const fontSize = width < 768 ? 18 : 20;
    const count = Math.max(8, Math.floor(width / fontSize));
    columns = new Array(count).fill(0);
    drops = columns.map(() => Math.random() * height);
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'top';
  };

  const draw = () => {
    if (!ctx) return;
    ctx.fillStyle = 'rgba(3, 8, 6, 0.14)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#76ff98';

    const fontSize = width < 768 ? 18 : 20;
    const step = fontSize * 1.1;

    columns.forEach((_, index) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = index * step;
      const y = drops[index];
      const alpha = 0.4 + Math.random() * 0.6;
      ctx.fillStyle = `rgba(118, 255, 152, ${alpha})`;
      ctx.fillText(char, x, y);
      if (y > height + fontSize * 2 && Math.random() > 0.975) {
        drops[index] = 0;
      }
      drops[index] += fontSize * (0.75 + Math.random() * 0.75);
    });

    frame += 1;
    requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(draw);
}
