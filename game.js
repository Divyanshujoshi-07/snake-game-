const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const COLS = 21, ROWS = 21;
const CELL = canvas.width / COLS; // 20px

let snake, dir, nextDir, food, score, best, level, gameLoop, running, foodAnim;

// Load best score
best = parseInt(localStorage.getItem('snakeBest') || '0');
document.getElementById('best').textContent = best;

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
function initGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ];
  dir      = { x: 1, y: 0 };
  nextDir  = { x: 1, y: 0 };
  score    = 0;
  level    = 1;
  foodAnim = 0;
  updateHUD();
  placeFood();
}

function placeFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

/* ─────────────────────────────────────────
   HUD
───────────────────────────────────────── */
function getSpeed() {
  return Math.max(60, 160 - (level - 1) * 18);
}

function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('speed').textContent = level + 'x';
}

function popAnim(id) {
  const el = document.getElementById(id);
  el.classList.remove('pop');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 150);
}

/* ─────────────────────────────────────────
   GAME LOOP
───────────────────────────────────────── */
function step() {
  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return endGame();
  }
  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  // Ate food?
  if (head.x === food.x && head.y === food.y) {
    score += level * 10;

    if (score > best) {
      best = score;
      localStorage.setItem('snakeBest', best);
      document.getElementById('best').textContent = best;
    }

    const newLevel = Math.floor(snake.length / 5) + 1;
    if (newLevel > level) {
      level = newLevel;
      restartLoop();
    }

    updateHUD();
    popAnim('score');
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function restartLoop() {
  clearInterval(gameLoop);
  gameLoop = setInterval(step, getSpeed());
}

/* ─────────────────────────────────────────
   DRAWING
───────────────────────────────────────── */
function draw() {
  // Background
  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid dots
  ctx.fillStyle = 'rgba(0,255,224,0.04)';
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      ctx.fillRect(x * CELL + CELL / 2 - 0.5, y * CELL + CELL / 2 - 0.5, 1, 1);
    }
  }

  drawFood();
  drawSnake();
}

function drawFood() {
  foodAnim = (foodAnim + 0.08) % (Math.PI * 2);
  const pulse = 0.85 + Math.sin(foodAnim) * 0.12;
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  const fr = CELL * 0.32 * pulse;

  ctx.save();

  // Outer radial glow
  const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, CELL * 0.8);
  grd.addColorStop(0, 'rgba(255,45,107,0.25)');
  grd.addColorStop(1, 'rgba(255,45,107,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(fx, fy, CELL * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Food core
  ctx.shadowBlur = 14;
  ctx.shadowColor = '#ff2d6b';
  ctx.fillStyle = '#ff2d6b';
  ctx.beginPath();
  ctx.arc(fx, fy, fr, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,180,200,0.6)';
  ctx.beginPath();
  ctx.arc(fx - fr * 0.25, fy - fr * 0.25, fr * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSnake() {
  snake.forEach((seg, i) => {
    const t      = i / snake.length;
    const isHead = i === 0;
    const x      = seg.x * CELL;
    const y      = seg.y * CELL;
    const pad    = isHead ? 1 : 2;
    const r      = isHead ? 4 : 3;

    // Colour fades head → tail
    const g     = Math.floor(190 * (1 - t * 0.7));
    const b     = Math.floor(220 * (1 - t * 0.7));
    const alpha = Math.max(0.15, 1 - t * 0.85);
    const color = isHead ? '#00ffe0' : `rgba(0,${g},${b},${alpha})`;

    ctx.save();

    if (isHead) {
      ctx.shadowBlur  = 18;
      ctx.shadowColor = '#00ffe0';
    } else if (i < 4) {
      ctx.shadowBlur  = 8;
      ctx.shadowColor = 'rgba(0,255,224,0.5)';
    }

    ctx.fillStyle = color;
    roundRect(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, r);
    ctx.fill();

    // Eyes on head
    if (isHead) {
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#ff2d6b';
      ctx.fillStyle   = '#ff2d6b';

      const ex1 = x + CELL / 2 + dir.y * 3 - dir.x * 3;
      const ey1 = y + CELL / 2 + dir.x * 3 + dir.y * 3;
      const ex2 = x + CELL / 2 - dir.y * 3 - dir.x * 3;
      const ey2 = y + CELL / 2 - dir.x * 3 + dir.y * 3;

      ctx.beginPath(); ctx.arc(ex1, ey1, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, 2, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h,     x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y,         x + r, y,         r);
  ctx.closePath();
}

/* ─────────────────────────────────────────
   START / END
───────────────────────────────────────── */
function startGame() {
  initGame();
  running = true;
  document.getElementById('overlay').classList.add('hidden');
  restartLoop();

  // Continuous food-pulse animation
  requestAnimationFrame(function loop() {
    if (!running) return;
    draw();
    requestAnimationFrame(loop);
  });
}

function endGame() {
  clearInterval(gameLoop);
  running = false;

  const overlay   = document.getElementById('overlay');
  const scoreEl   = document.getElementById('overlay-score');

  document.getElementById('overlay-title').textContent = 'GAME OVER';
  document.getElementById('overlay-msg').textContent   = 'Process terminated';
  scoreEl.style.display = 'block';
  scoreEl.textContent   = `Score: ${score}  ·  Best: ${best}`;
  document.getElementById('startBtn').textContent = 'REINITIALIZE';
  overlay.classList.remove('hidden');

  // Brief death flash
  ctx.fillStyle = 'rgba(255,45,107,0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/* ─────────────────────────────────────────
   INPUT — Keyboard
───────────────────────────────────────── */
const dirMap = {
  ArrowUp:    { x: 0,  y: -1 },
  ArrowDown:  { x: 0,  y:  1 },
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x: 1,  y:  0 },
  w: { x: 0,  y: -1 },
  s: { x: 0,  y:  1 },
  a: { x: -1, y:  0 },
  d: { x: 1,  y:  0 },
};

const keyEls = {
  ArrowUp:    'key-up',
  ArrowDown:  'key-down',
  ArrowLeft:  'key-left',
  ArrowRight: 'key-right',
  w: 'key-up',
  s: 'key-down',
  a: 'key-left',
  d: 'key-right',
};

function applyDir(d) {
  if (!d) return;
  if (d.x !== 0 && dir.x !== 0) return; // prevent 180° turns
  if (d.y !== 0 && dir.y !== 0) return;
  nextDir = d;
}

document.addEventListener('keydown', e => {
  const d = dirMap[e.key];
  if (d) { e.preventDefault(); applyDir(d); }
  const el = keyEls[e.key];
  if (el) document.getElementById(el)?.classList.add('active');
});

document.addEventListener('keyup', e => {
  const el = keyEls[e.key];
  if (el) document.getElementById(el)?.classList.remove('active');
});

/* ─────────────────────────────────────────
   INPUT — Touch / Swipe
───────────────────────────────────────── */
let touchStart = null;

canvas.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    applyDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
  } else {
    applyDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  }
  touchStart = null;
}, { passive: true });

/* ─────────────────────────────────────────
   BUTTON
───────────────────────────────────────── */
document.getElementById('startBtn').addEventListener('click', startGame);

/* ─────────────────────────────────────────
   INITIAL RENDER
───────────────────────────────────────── */
initGame();
draw();
