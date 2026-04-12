(() => {
  // ─── Card Data ───
  const PRESET_MESSAGES = [
    { emoji: "💌", msg: "" }, // slot 0: replaced with user's custom message
    { emoji: "💜", msg: "May your day be as extraordinary as Infinity itself." },
    { emoji: "⭐", msg: "The strongest birthday wishes... from the strongest sorcerer." },
    { emoji: "🌟", msg: "Another year, another level. You keep getting better." },
    { emoji: "💫", msg: "You deserve a birthday as limitless as my power." },
    { emoji: "🎉", msg: "I've seen many birthdays. Yours? Still the most special." },
    { emoji: "💝", msg: "The world is brighter because you're in it. Truly." },
    { emoji: "🔮", msg: "Today is YOUR domain expansion. Claim it." },
  ];

  const CARD_COLORS = [
    { bg: "rgba(255,107,157,0.08)", border: "rgba(255,107,157,0.2)", flap: "rgba(255,107,157,0.06)", accent: "#FF6B9D", backStart: "#2a1520", backEnd: "#1a0a18" },
    { bg: "rgba(155,89,182,0.08)",  border: "rgba(155,89,182,0.2)",  flap: "rgba(155,89,182,0.06)",  accent: "#9B59B6", backStart: "#1e1530", backEnd: "#150e26" },
    { bg: "rgba(241,196,15,0.08)",  border: "rgba(241,196,15,0.2)",  flap: "rgba(241,196,15,0.06)",  accent: "#F1C40F", backStart: "#252010", backEnd: "#1a1608" },
    { bg: "rgba(52,152,219,0.08)",  border: "rgba(52,152,219,0.2)",  flap: "rgba(52,152,219,0.06)",  accent: "#3498DB", backStart: "#101828", backEnd: "#0a1020" },
    { bg: "rgba(26,188,156,0.08)",  border: "rgba(26,188,156,0.2)",  flap: "rgba(26,188,156,0.06)",  accent: "#1ABC9C", backStart: "#0e201e", backEnd: "#081815" },
    { bg: "rgba(231,76,60,0.08)",   border: "rgba(231,76,60,0.2)",   flap: "rgba(231,76,60,0.06)",   accent: "#E74C3C", backStart: "#261210", backEnd: "#1a0c0a" },
    { bg: "rgba(46,204,113,0.08)",  border: "rgba(46,204,113,0.2)",  flap: "rgba(46,204,113,0.06)",  accent: "#2ECC71", backStart: "#0e2218", backEnd: "#081a12" },
    { bg: "rgba(224,86,193,0.08)",  border: "rgba(224,86,193,0.2)",  flap: "rgba(224,86,193,0.06)",  accent: "#E056C1", backStart: "#241528", backEnd: "#1a0e20" },
  ];

  const CONFETTI_COLORS = ["#FF6B9D", "#FFD700", "#9B59B6", "#3498DB", "#2ECC71", "#E74C3C", "#F39C12", "#1ABC9C", "#E056C1"];

  // ─── DOM refs ───
  const canvasBg = document.getElementById("fx-bg");
  const canvasFront = document.getElementById("fx-front");
  const ctxBg = canvasBg.getContext("2d");
  const ctxFr = canvasFront.getContext("2d");
  const cardsEl = document.getElementById("cards");
  const nameEl = document.getElementById("name");
  const progressCount = document.getElementById("progress-count");
  const progressTotal = document.getElementById("progress-total");
  const finaleEl = document.getElementById("finale");
  const finaleTitle = document.getElementById("finale-title");
  const finaleText = document.getElementById("finale-text");
  const closeBtn = document.getElementById("close-btn");
  const finaleClose = document.getElementById("finale-close");

  let opened = 0;
  let totalCards = 8;
  let birthdayName = "";

  // ─── VFX State ───
  const stars = [];
  const confetti = [];
  const fireworks = [];
  let vfxTime = 0;
  let confettiSpawnAccum = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvasBg.width = w; canvasBg.height = h;
    canvasFront.width = w; canvasFront.height = h;
  }

  // ─── Stars ───
  function initStars() {
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * canvasBg.width,
        y: Math.random() * canvasBg.height,
        r: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
  }

  function drawStars(now) {
    ctxBg.clearRect(0, 0, canvasBg.width, canvasBg.height);
    stars.forEach(s => {
      const alpha = 0.2 + 0.6 * ((Math.sin(now * 0.001 * s.speed + s.phase) + 1) / 2);
      ctxBg.globalAlpha = alpha;
      ctxBg.fillStyle = "#fff";
      ctxBg.beginPath();
      ctxBg.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctxBg.fill();
    });
    ctxBg.globalAlpha = 1;
  }

  // ─── Confetti ───
  function spawnConfetti(count = 3) {
    for (let i = 0; i < count; i++) {
      confetti.push({
        x: Math.random() * canvasFront.width,
        y: -12,
        w: 4 + Math.random() * 6,
        h: 6 + Math.random() * 10,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        vx: (Math.random() - 0.5) * 1.8,
        vy: 1.2 + Math.random() * 2.8,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.12,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.015 + Math.random() * 0.025,
      });
    }
  }

  function updateConfetti() {
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i];
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      p.wobble += p.wobbleSpeed;
      if (p.y > canvasFront.height + 20) confetti.splice(i, 1);
    }
  }

  function drawConfetti() {
    confetti.forEach(p => {
      ctxFr.save();
      ctxFr.translate(p.x, p.y);
      ctxFr.rotate(p.rot);
      ctxFr.fillStyle = p.color;
      ctxFr.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctxFr.restore();
    });
  }

  // ─── Fireworks ───
  function burstFirework(x, y) {
    const count = 28 + Math.floor(Math.random() * 20);
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 2 + Math.random() * 4.5;
      fireworks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.008 + Math.random() * 0.018,
        color,
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  function updateFireworks() {
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const p = fireworks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) fireworks.splice(i, 1);
    }
  }

  function drawFireworks() {
    fireworks.forEach(p => {
      ctxFr.globalAlpha = Math.max(0, p.life);
      ctxFr.fillStyle = p.color;
      ctxFr.beginPath();
      ctxFr.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctxFr.fill();
    });
    ctxFr.globalAlpha = 1;
  }

  // ─── VFX Loop ───
  let lastFireworkAt = 0;

  function vfxLoop(now) {
    vfxTime = now;

    // Background: stars
    drawStars(now);

    // Front: confetti + fireworks
    ctxFr.clearRect(0, 0, canvasFront.width, canvasFront.height);

    confettiSpawnAccum++;
    if (confettiSpawnAccum % 3 === 0) spawnConfetti(2);

    updateConfetti();
    drawConfetti();

    // Periodic fireworks
    if (now - lastFireworkAt > 2500 + Math.random() * 2000) {
      lastFireworkAt = now;
      const x = canvasFront.width * (0.15 + Math.random() * 0.7);
      const y = canvasFront.height * (0.1 + Math.random() * 0.35);
      burstFirework(x, y);
    }

    updateFireworks();
    drawFireworks();

    requestAnimationFrame(vfxLoop);
  }

  // ─── Cards ───
  function createCards(messages) {
    cardsEl.innerHTML = "";
    totalCards = messages.length;
    progressTotal.textContent = totalCards;

    messages.forEach((card, i) => {
      const color = CARD_COLORS[i % CARD_COLORS.length];
      const delay = 1.8 + i * 0.12;

      const cardEl = document.createElement("div");
      cardEl.className = "card";
      cardEl.style.animation = `cardIn 0.55s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`;
      cardEl.style.setProperty("--card-bg", color.bg);
      cardEl.style.setProperty("--card-border", color.border);
      cardEl.style.setProperty("--card-flap", color.flap);
      cardEl.style.setProperty("--card-accent", color.accent);
      cardEl.style.setProperty("--card-back-start", color.backStart);
      cardEl.style.setProperty("--card-back-end", color.backEnd);
      cardEl.style.setProperty("--delay", `${i * 0.4}s`);

      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front">
            <span class="card-emoji">${card.emoji}</span>
            <span class="card-label">Wish #${i + 1}</span>
            <span class="card-seal">✦</span>
          </div>
          <div class="card-face card-back">
            <span class="card-quote-mark">"</span>
            <span class="card-msg">${card.msg}</span>
            <span class="card-sig">— Gojo ✦</span>
          </div>
        </div>
      `;

      cardEl.addEventListener("click", () => {
        if (cardEl.classList.contains("flipped")) return;
        cardEl.classList.add("flipped", "revealed");

        // Firework burst from card position
        const rect = cardEl.getBoundingClientRect();
        burstFirework(rect.left + rect.width / 2, rect.top + rect.height / 2);

        opened++;
        progressCount.textContent = opened;

        if (opened >= totalCards) {
          setTimeout(showFinale, 1200);
        }
      });

      cardsEl.appendChild(cardEl);
    });
  }

  // ─── Finale ───
  function showFinale() {
    // Rapid firework bursts
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        burstFirework(
          canvasFront.width * (0.1 + Math.random() * 0.8),
          canvasFront.height * (0.1 + Math.random() * 0.5)
        );
      }, i * 300);
    }

    finaleTitle.textContent = birthdayName
      ? `${birthdayName}, you're truly special.`
      : "You're truly special.";

    finaleEl.classList.add("visible");
  }

  // ─── Close ───
  function closeCelebration() {
    if (window.electronAPI?.closeBirthday) {
      window.electronAPI.closeBirthday();
    } else {
      window.close();
    }
  }

  closeBtn.addEventListener("click", closeCelebration);
  finaleClose.addEventListener("click", closeCelebration);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCelebration();
  });

  // ─── Init ───
  async function init() {
    resize();
    window.addEventListener("resize", resize);
    initStars();

    // Get birthday data from main process
    let data = { name: "", message: "" };
    try {
      if (window.electronAPI?.getBirthdayData) {
        data = await window.electronAPI.getBirthdayData();
      }
    } catch (e) {
      console.warn("Could not fetch birthday data:", e);
    }

    birthdayName = (data.name || "").trim();

    // Set name
    if (birthdayName) {
      nameEl.textContent = birthdayName;
    } else {
      nameEl.style.display = "none";
    }

    // Build card messages
    const messages = PRESET_MESSAGES.map((m, i) => ({ ...m }));
    const customMsg = (data.message || "").trim();
    if (customMsg) {
      messages[0].msg = customMsg;
    } else {
      messages[0].msg = "Wishing you the happiest birthday ever!";
    }

    createCards(messages);

    // Initial firework burst
    setTimeout(() => {
      burstFirework(canvasFront.width * 0.3, canvasFront.height * 0.25);
      burstFirework(canvasFront.width * 0.7, canvasFront.height * 0.2);
    }, 800);

    requestAnimationFrame(vfxLoop);
  }

  init();
})();
