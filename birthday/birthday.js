(() => {
  // ─── Palette ───
  const PETAL_COLORS = [
    "rgba(200,140,130,0.45)", "rgba(220,160,150,0.35)",
    "rgba(180,120,120,0.40)", "rgba(240,190,170,0.30)",
    "rgba(160,110,130,0.35)", "rgba(210,170,140,0.28)",
  ];
  const SPARK_COLORS = [
    "rgba(255,230,210,0.7)", "rgba(255,200,170,0.5)",
    "rgba(220,180,160,0.6)", "rgba(255,215,180,0.4)",
  ];

  // ─── DOM ───
  const canvas   = document.getElementById("fx");
  const ctx      = canvas.getContext("2d");
  const nameEl   = document.getElementById("name-text");
  const closeBtn = document.getElementById("close-btn");
  const closingOverlay = document.getElementById("closing-overlay");
  const navPrev  = document.getElementById("nav-prev");
  const navNext  = document.getElementById("nav-next");
  const navDots  = document.getElementById("nav-dots");

  const pages    = document.querySelectorAll(".page");
  const totalPages = pages.length;

  // ─── State ───
  let currentPage = 0;
  let isAnimating = false;
  let isClosing   = false;

  // VFX arrays
  const stars  = [];
  const petals = [];
  const sparks = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ═══════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════
  function buildDots() {
    navDots.innerHTML = "";
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement("div");
      dot.className = "nav-dot" + (i === 0 ? " active" : "");
      dot.addEventListener("click", () => goToPage(i));
      navDots.appendChild(dot);
    }
  }

  function updateNav() {
    navPrev.classList.toggle("hidden", currentPage === 0);
    navNext.classList.toggle("hidden", currentPage === totalPages - 1);
    navDots.querySelectorAll(".nav-dot").forEach((d, i) => {
      d.classList.toggle("active", i === currentPage);
    });
  }

  function goToPage(target) {
    if (target === currentPage || isAnimating || target < 0 || target >= totalPages) return;
    isAnimating = true;

    const forward = target > currentPage;
    const oldPage = pages[currentPage];
    const newPage = pages[target];

    // Position new page off-screen instantly (no transition)
    newPage.style.transition = "none";
    newPage.style.opacity = "0";
    newPage.style.transform = forward ? "translateX(80px)" : "translateX(-80px)";
    newPage.style.pointerEvents = "none";

    // Force reflow so the "no transition" positioning takes effect
    void newPage.offsetWidth;

    // Now animate both pages with transitions
    const trans = "opacity 0.65s ease, transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)";

    // New page slides in
    newPage.style.transition = trans;
    newPage.style.opacity = "1";
    newPage.style.transform = "translateX(0)";
    newPage.style.pointerEvents = "auto";

    // Old page slides out in the opposite direction
    oldPage.style.transition = trans;
    oldPage.style.opacity = "0";
    oldPage.style.transform = forward ? "translateX(-80px)" : "translateX(80px)";
    oldPage.style.pointerEvents = "none";

    currentPage = target;
    updateNav();

    setTimeout(() => { isAnimating = false; }, 680);
  }

  function nextPage() { goToPage(currentPage + 1); }
  function prevPage() { goToPage(currentPage - 1); }

  navNext.addEventListener("click", nextPage);
  navPrev.addEventListener("click", prevPage);

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (isClosing) return;
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextPage(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); prevPage(); }
    if (e.key === "Escape") closeCelebration();
  });

  // Mouse wheel
  let wheelCooldown = false;
  document.addEventListener("wheel", (e) => {
    if (isClosing || wheelCooldown) return;
    wheelCooldown = true;
    if (e.deltaY > 0 || e.deltaX > 0) nextPage();
    else prevPage();
    setTimeout(() => { wheelCooldown = false; }, 800);
  }, { passive: true });

  // ═══════════════════════════════════════════
  //  VFX
  // ═══════════════════════════════════════════

  // Stars
  function initStars() {
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 0.3 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 1.2,
        warmth: Math.random(),
      });
    }
  }

  function drawStars(now) {
    stars.forEach(s => {
      const alpha = 0.08 + 0.45 * ((Math.sin(now * 0.0008 * s.speed + s.phase) + 1) / 2);
      ctx.globalAlpha = alpha;
      const r = 215 + Math.round(s.warmth * 40);
      const g = 195 + Math.round(s.warmth * -25);
      const b = 190 + Math.round(s.warmth * -25);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // Petals
  function spawnPetal() {
    petals.push({
      x: Math.random() * canvas.width, y: -20,
      size: 3 + Math.random() * 5,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      vx: (Math.random() - 0.5) * 0.5,
      vy: 0.25 + Math.random() * 0.6,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.015,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.006 + Math.random() * 0.01,
      opacity: 0.35 + Math.random() * 0.35,
    });
  }

  function updateAndDrawPetals() {
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.x += p.vx + Math.sin(p.wobble) * 0.35;
      p.y += p.vy;
      p.rot += p.rotSpeed;
      p.wobble += p.wobbleSpeed;
      if (p.y > canvas.height + 30) { petals.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Golden sparks
  function spawnSpark() {
    sparks.push({
      x: canvas.width * (0.15 + Math.random() * 0.7),
      y: canvas.height * (0.5 + Math.random() * 0.4),
      size: 1 + Math.random() * 2.5,
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      vy: -(0.15 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * 0.2,
      life: 1,
      decay: 0.003 + Math.random() * 0.005,
    });
  }

  function updateAndDrawSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const g = sparks[i];
      g.x += g.vx; g.y += g.vy; g.life -= g.decay;
      if (g.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = g.life * 0.5;
      ctx.fillStyle = g.color;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.size * g.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  // VFX loop
  let frameCount = 0;
  function vfxLoop(now) {
    if (isClosing) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars(now);
    frameCount++;
    if (frameCount % 10 === 0) spawnPetal();
    updateAndDrawPetals();
    if (frameCount % 14 === 0) spawnSpark();
    updateAndDrawSparks();
    requestAnimationFrame(vfxLoop);
  }

  // ═══════════════════════════════════════════
  //  NAME RENDERER
  // ═══════════════════════════════════════════
  function renderName(name) {
    nameEl.innerHTML = "";
    name.split("").forEach((char, i) => {
      const span = document.createElement("span");
      span.className = "name-letter";
      span.textContent = char === " " ? "\u00A0" : char;
      span.style.animationDelay = `${1.1 + i * 0.09}s`;
      nameEl.appendChild(span);
    });
  }

  // ═══════════════════════════════════════════
  //  CLOSE
  // ═══════════════════════════════════════════
  function closeCelebration() {
    if (isClosing) return;
    isClosing = true;

    // Fade to black, then close
    closingOverlay.classList.add("active");

    setTimeout(() => {
      if (window.electronAPI?.closeBirthday) {
        window.electronAPI.closeBirthday();
      } else {
        window.close();
      }
    }, 750);
  }

  closeBtn.addEventListener("click", closeCelebration);

  // ═══════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════
  async function init() {
    resize();
    window.addEventListener("resize", resize);
    initStars();
    buildDots();
    updateNav();

    // Fetch data
    let data = { name: "", message: "" };
    try {
      if (window.electronAPI?.getBirthdayData) {
        data = await window.electronAPI.getBirthdayData();
      }
    } catch (e) { console.warn("Birthday data error:", e); }

    const name = (data.name || "").trim() || "Raccoon";
    renderName(name);

    // Seed petals
    for (let i = 0; i < 12; i++) {
      petals.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.8,
        size: 3 + Math.random() * 5,
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.2 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.006 + Math.random() * 0.01,
        opacity: 0.25 + Math.random() * 0.3,
      });
    }

    for (let i = 0; i < 6; i++) {
      setTimeout(() => spawnSpark(), i * 250);
    }

    requestAnimationFrame(vfxLoop);
  }

  init();
})();
