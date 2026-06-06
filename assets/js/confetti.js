const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animating = false;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

function createParticle() {
  const colors = ['#ffd700', '#ff6b35', '#fff', '#c9a227', '#4ade80', '#f472b6'];
  return {
    x: Math.random() * canvas.width,
    y: -20,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: Math.random() * 4 + 3,
    speedX: (Math.random() - 0.5) * 4,
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 8,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter((p) => p.y < canvas.height + 20);

  for (const p of particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillStyle = p.color;

    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    p.y += p.speedY;
    p.x += p.speedX;
    p.rotation += p.spin;
    p.speedY += 0.05;
  }

  if (particles.length > 0) {
    requestAnimationFrame(draw);
  } else {
    animating = false;
  }
}

export function launchConfetti(intensity = 'normal') {
  const count = intensity === 'massive' ? 180 : intensity === 'big' ? 100 : 50;
  for (let i = 0; i < count; i++) {
    particles.push(createParticle());
  }

  if (!animating) {
    animating = true;
    requestAnimationFrame(draw);
  }
}
