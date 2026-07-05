(function () {
  const ACCENTS = ["76, 201, 255", "179, 76, 255", "76, 255, 176"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.id = "bg-particles";
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "-1",
    pointerEvents: "none",
  });
  document.body.prepend(canvas);

  const spotlight = document.createElement("div");
  spotlight.id = "bg-spotlight";
  Object.assign(spotlight.style, {
    position: "fixed",
    inset: "0",
    zIndex: "-1",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 0.4s ease",
    background: "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(76, 201, 255, 0.10), transparent 70%)",
  });
  document.body.prepend(spotlight);

  if (reduceMotion) return;

  const ctx = canvas.getContext("2d");
  let width, height, dpr, particles;
  const mouse = { x: 0, y: 0, active: false };

  function spawnParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.6 + 0.6,
      color: ACCENTS[(Math.random() * ACCENTS.length) | 0],
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(90, Math.round((width * height) / 16000));
    particles = Array.from({ length: count }, spawnParticle);
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 130) {
          const force = (130 - dist) / 130;
          p.x += (dx / dist) * force * 0.7;
          p.y += (dy / dist) * force * 0.7;
        }
      }

      if (p.x < -20) p.x = width + 20;
      else if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      else if (p.y > height + 20) p.y = -20;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, 0.6)`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 115) {
          ctx.strokeStyle = `rgba(76, 201, 255, ${(1 - dist / 115) * 0.16})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    if (mouse.active) {
      for (const p of particles) {
        const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dist < 150) {
          ctx.strokeStyle = `rgba(179, 76, 255, ${(1 - dist / 150) * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    if (document.visibilityState === "visible") requestAnimationFrame(step);
  }

  let spotlightTimer;
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
    document.body.style.setProperty("--mx", e.clientX + "px");
    document.body.style.setProperty("--my", e.clientY + "px");
    spotlight.style.opacity = "1";
    clearTimeout(spotlightTimer);
    spotlightTimer = setTimeout(() => { spotlight.style.opacity = "0"; }, 2000);
  });
  window.addEventListener("mouseleave", () => { mouse.active = false; });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") requestAnimationFrame(step);
  });

  resize();
  requestAnimationFrame(step);
})();
