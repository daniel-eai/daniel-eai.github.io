const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');
const matrixCanvas = document.querySelector('#matrix-canvas');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    siteNav.classList.toggle('is-open', !isOpen);
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target.matches('a')) {
      menuToggle.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('is-open');
    }
  });
}

if (matrixCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const context = matrixCanvas.getContext('2d');
  const glyphs = ['별 헤는 밤', '별 헤는 밤', '별 헤는 밤'];
  let columns = [];
  let fontSize = 14;
  let animationFrame;

  const resizeMatrix = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    matrixCanvas.width = Math.floor(window.innerWidth * ratio);
    matrixCanvas.height = Math.floor(window.innerHeight * ratio);
    matrixCanvas.style.width = `${window.innerWidth}px`;
    matrixCanvas.style.height = `${window.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    fontSize = window.innerWidth < 600 ? 12 : 14;
    columns = Array.from({ length: Math.ceil(window.innerWidth / fontSize) }, () => Math.random() * -40);
  };

  const drawMatrix = () => {
    context.fillStyle = 'rgba(6, 16, 11, 0.08)';
    context.fillRect(0, 0, window.innerWidth, window.innerHeight);
    context.font = `${fontSize}px monospace`;
    context.fillStyle = '#72ffb4';
    columns.forEach((y, index) => {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      context.fillText(glyph, index * fontSize, y * fontSize);
      columns[index] = y > window.innerHeight / fontSize + Math.random() * 40 ? Math.random() * -20 : y + 0.42;
    });
    animationFrame = window.requestAnimationFrame(drawMatrix);
  };

  resizeMatrix();
  window.addEventListener('resize', resizeMatrix);
  drawMatrix();
  window.addEventListener('pagehide', () => window.cancelAnimationFrame(animationFrame), { once: true });
}
