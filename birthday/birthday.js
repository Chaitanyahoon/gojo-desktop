(() => {
  // ─── Config ───
  const CONFETTI_COLORS = [
    "#FF6B9D", "#FFD700", "#9B59B6", "#3498DB", "#2ECC71",
    "#E74C3C", "#F39C12", "#1ABC9C", "#E056C1", "#FF3F7A",
    "#FFAA00", "#FF85C0",
  ];
  const EMOJIS = ["🎂", "🎉", "🎊", "🥳", "🎈", "🎁", "💖", "✨", "🌟", "⭐", "🍰", "🎵"];

  // ─── DOM ───
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d");
  const celebrationEl = document.getElementById("celebration");
  const nameTextEl = document.getElementById("name-text");
  const happyTextEl = document.getElementById("happy-text");
  const subtitleEl = document.getElementById("subtitle");
  const closeBtn = document.getElementById("close-btn");
  const bgAurora = document.getElementById("bg-aurora");
  const lightRays = document.getElementById("light-rays");

  // ─── VFX State ───
  const stars = [];
  const confetti = [];
  const fireworks = [];
  let isClosing = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ─── Stars ───
  function initStars() {
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 0.4 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 2,
      });
    }
  }

  function drawStars(now) {
    stars.forEach(s => {
      const alpha = 0.15 + 0.7 * ((Math.sin(now * 0.001 * s.speed + s.phase) + 1) / 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ─── Confetti ───
  function spawnConfetti(count = 4) {
    for (let i = 0; i < count; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: -15,
        w: 4 + Math.random() * 8,
        h: 6 + Math.random() * 12,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        vx: (Math.random() - 0.5) * 2.5,
        vy: 1.5 + Math.random() * 3.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.03,
      });
    }
  }

  function updateAndDrawConfetti() {
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i];
      p.x += p.vx + Math.sin(p.wobble) * 0.8;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      p.wobble += p.wobbleSpeed;
      if (p.y > canvas.height + 20) { confetti.splice(i, 1); continue; }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }

  // ─── Fireworks ───
  function burstFirework(x, y, big = false) {
    const count = big ? 50 + Math.floor(Math.random() * 30) : 25 + Math.floor(Math.random() * 15);
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const color2 = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = (big ? 3 : 2) + Math.random() * (big ? 6 : 4);
      fireworks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.006 + Math.random() * 0.016,
        color: i % 3 === 0 ? color2 : color,
        size: (big ? 2 : 1.5) + Math.random() * (big ? 3 : 2),
        trail: big,
      });
    }
  }

  function updateAndDrawFireworks() {
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const p = fireworks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.025;
      p.vx *= 0.988;
      p.vy *= 0.988;
      p.life -= p.decay;
      if (p.life <= 0) { fireworks.splice(i, 1); continue; }

      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();

      // Trail effect for big fireworks
      if (p.trail && p.life > 0.3) {
        ctx.globalAlpha = p.life * 0.3;
        ctx.beginPath();
        ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, p.size * p.life * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ─── Floating Emojis ───
  let emojiSpawnAccum = 0;

  function spawnFloatingEmoji() {
    const emoji = document.createElement("div");
    emoji.className = "floating-emoji";
    emoji.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    emoji.style.left = (5 + Math.random() * 90) + "vw";
    emoji.style.bottom = "-40px";
    emoji.style.fontSize = (24 + Math.random() * 28) + "px";
    emoji.style.animationDuration = (4 + Math.random() * 5) + "s";
    emoji.style.animationDelay = "0s";
    document.body.appendChild(emoji);
    emoji.addEventListener("animationend", () => emoji.remove());
  }

  // ─── Sparkles around text ───
  function spawnSparkles(container, count = 20) {
    const rect = container.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "sparkle";
      sparkle.style.left = (Math.random() * rect.width - 5) + "px";
      sparkle.style.top = (Math.random() * rect.height - 5) + "px";
      sparkle.style.animationDelay = (Math.random() * 2) + "s";
      sparkle.style.animationDuration = (0.8 + Math.random() * 1.2) + "s";
      const colors = ["#FFD700", "#FF6B9D", "#fff", "#E056C1"];
      sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
      sparkle.style.boxShadow = `0 0 8px 2px ${sparkle.style.background}`;
      container.appendChild(sparkle);
    }
  }

  // ─── VFX Loop ───
  let frameCount = 0;
  let lastFireworkAt = 0;

  function vfxLoop(now) {
    if (isClosing) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars(now);

    // Confetti — spawn every 2 frames
    frameCount++;
    if (frameCount % 2 === 0) spawnConfetti(3);
    updateAndDrawConfetti();

    // Periodic fireworks — one every 1.5-3s
    if (now - lastFireworkAt > 1500 + Math.random() * 1500) {
      lastFireworkAt = now;
      burstFirework(
        canvas.width * (0.1 + Math.random() * 0.8),
        canvas.height * (0.08 + Math.random() * 0.4),
        Math.random() > 0.5
      );
    }
    updateAndDrawFireworks();

    // Floating emojis
    emojiSpawnAccum++;
    if (emojiSpawnAccum % 40 === 0) spawnFloatingEmoji();

    requestAnimationFrame(vfxLoop);
  }

  // ─── Build the name letter by letter ───
  function renderName(name) {
    nameTextEl.innerHTML = "";
    const letters = name.split("");

    letters.forEach((char, i) => {
      const span = document.createElement("span");
      span.className = "name-letter";
      span.textContent = char === " " ? "\u00A0" : char;
      span.style.setProperty("--d", `${0.9 + i * 0.07}s`);
      span.style.setProperty("--i", i);
      nameTextEl.appendChild(span);
    });

    // Exclamation marks with extra energy
    const exclaimContainer = document.createElement("span");
    exclaimContainer.className = "exclaim-container";
    for (let i = 0; i < 3; i++) {
      const ex = document.createElement("span");
      ex.className = "exclaim";
      ex.textContent = "!";
      ex.style.animationDelay = `${1.2 + letters.length * 0.07 + i * 0.12}s, ${i * 0.2}s`;
      exclaimContainer.appendChild(ex);
    }
    nameTextEl.appendChild(exclaimContainer);
  }

  // ─── Close with smooth transition ───
  function closeCelebration() {
    if (isClosing) return;
    isClosing = true;

    celebrationEl.classList.add("closing");
    bgAurora.classList.add("closing");
    lightRays.classList.add("closing");
    canvas.classList.add("closing");

    // Wait for animation to finish, then close window
    setTimeout(() => {
      if (window.electronAPI?.closeBirthday) {
        window.electronAPI.closeBirthday();
      } else {
        window.close();
      }
    }, 650);
  }

  closeBtn.addEventListener("click", closeCelebration);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCelebration();
  });

  // ─── Init ───
  async function init() {
    resize();
    window.addEventListener("resize", resize);
    initStars();

    // Fetch birthday data
    let data = { name: "", message: "" };
    try {
      if (window.electronAPI?.getBirthdayData) {
        data = await window.electronAPI.getBirthdayData();
      }
    } catch (e) {
      console.warn("Could not fetch birthday data:", e);
    }

    const name = (data.name || "").trim() || "You";

    // Render name
    renderName(name);

    // Activate animations
    celebrationEl.classList.add("active");
    lightRays.classList.add("active");
    document.body.classList.add("screen-shake");

    // Add sparkles after letters animate in
    setTimeout(() => {
      spawnSparkles(nameTextEl.closest(".name-container"), 25);
    }, 1500);

    // Initial firework barrage
    setTimeout(() => {
      burstFirework(canvas.width * 0.3, canvas.height * 0.3, true);
      burstFirework(canvas.width * 0.7, canvas.height * 0.25, true);
    }, 400);

    setTimeout(() => {
      burstFirework(canvas.width * 0.5, canvas.height * 0.2, true);
      burstFirework(canvas.width * 0.2, canvas.height * 0.4, true);
      burstFirework(canvas.width * 0.8, canvas.height * 0.35, true);
    }, 900);

    // Spawn a burst of emojis on entrance
    for (let i = 0; i < 8; i++) {
      setTimeout(() => spawnFloatingEmoji(), 300 + i * 200);
    }

    // Start VFX loop
    requestAnimationFrame(vfxLoop);
  }

  init();
})();
