(() => {
  const hud = document.getElementById("hud");

  const ringMood   = document.getElementById("ring-mood");
  const ringEnergy = document.getElementById("ring-energy");
  const ringHunger = document.getElementById("ring-hunger");
  const valMood    = document.getElementById("val-mood");
  const valEnergy  = document.getElementById("val-energy");
  const valHunger  = document.getElementById("val-hunger");

  // Circumference = 2 * π * r = 2 * π * 8 ≈ 50.27
  const CIRCUMFERENCE = 50.27;

  function setRing(ring, value) {
    const offset = CIRCUMFERENCE - (CIRCUMFERENCE * value / 100);
    ring.style.strokeDashoffset = offset;
  }

  function applyStats(stats) {
    if (!stats) return;
    const mood   = Math.round(Math.max(0, Math.min(100, stats.mood   ?? 0)));
    const energy = Math.round(Math.max(0, Math.min(100, stats.energy ?? 0)));
    const hunger = Math.round(Math.max(0, Math.min(100, stats.hunger ?? 0)));

    setRing(ringMood, mood);
    setRing(ringEnergy, energy);
    setRing(ringHunger, hunger);

    valMood.textContent   = mood;
    valEnergy.textContent = energy;
    valHunger.textContent = hunger;
  }

  window.electronAPI.onHudShow((stats) => {
    applyStats(stats);
    requestAnimationFrame(() => hud.classList.add("visible"));
  });

  window.electronAPI.onHudHide(() => {
    hud.classList.remove("visible");
  });

  window.electronAPI.onHudUpdate((stats) => {
    applyStats(stats);
  });
})();
