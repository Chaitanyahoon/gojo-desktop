(() => {
  const ns = (window.GojoPet = window.GojoPet || {});

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  class StatsManager {
    constructor(initialStats) {
      this.stats = {
        mood: 80,
        energy: 90,
        hunger: 70,
        age: 0,
        name: "Gojo Satoru",
        createdAt: Date.now(),
        ...initialStats,
      };
      this.saveCooldown = 0;
      this.dirty = false;
    }

    get snapshot() {
      return { ...this.stats };
    }

    async persist() {
      if (!this.dirty || !window.electronAPI) {
        return;
      }
      await window.electronAPI.updateStats(this.stats);
      this.dirty = false;
    }

    markDirty() {
      this.dirty = true;
      this.saveCooldown = 3000;
    }

    update(dt) {
      const minute = dt / 60000;
      this.stats.mood = clamp(this.stats.mood - minute, 0, 100);
      this.stats.energy = clamp(this.stats.energy - minute * 0.5, 0, 100);
      this.stats.hunger = clamp(this.stats.hunger - minute * 0.8, 0, 100);
      this.stats.age = Math.max(
        0,
        Math.floor((Date.now() - this.stats.createdAt) / 86400000)
      );
      this.markDirty();

      if (this.saveCooldown > 0) {
        this.saveCooldown -= dt;
      }
      if (this.saveCooldown <= 0 && this.dirty) {
        this.persist();
      }
    }

    adjust(patch) {
      Object.entries(patch).forEach(([key, delta]) => {
        if (typeof this.stats[key] !== "number") {
          return;
        }
        this.stats[key] = clamp(this.stats[key] + delta, 0, 100);
      });
      this.markDirty();
    }

    set(patch) {
      this.stats = { ...this.stats, ...patch };
      this.markDirty();
    }

    restoreEnergy(dt, rate = 0.9) {
      const energyGain = (dt / 60000) * rate;
      this.stats.energy = clamp(this.stats.energy + energyGain, 0, 100);
      this.stats.mood = clamp(this.stats.mood + energyGain * 0.3, 0, 100);
      this.markDirty();
    }
  }

  ns.StatsManager = StatsManager;
})();
