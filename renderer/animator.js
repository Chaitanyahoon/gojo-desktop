(() => {
  const ns = (window.GojoPet = window.GojoPet || {});

  const PET_STATES = {
    IDLE: "IDLE",
    WAVE: "WAVE",
    GLASSES: "GLASSES",
    ABILITY: "ABILITY",
    SLEEP_TRANSITION: "SLEEP_TRANSITION",
    SLEEP: "SLEEP",
    WAKE: "WAKE",
    RUN: "RUN",
    JUMP: "JUMP",
    SIT: "SIT",
    EAT: "EAT",
    INFINITY: "INFINITY",
    DANCE: "DANCE",
    STRETCH: "STRETCH",
    LOOK_AROUND: "LOOK_AROUND",
    PHONE: "PHONE",
    FALL: "FALL",
    PICKUP: "PICKUP",
    POPPER: "POPPER",
  };

  // States that can be interrupted by personality or user actions
  const INTERRUPTIBLE = new Set([
    PET_STATES.IDLE,
    PET_STATES.RUN,
    PET_STATES.SIT,
    PET_STATES.DANCE,
    PET_STATES.INFINITY,
  ]);

  const STATE_CONFIG = {
    [PET_STATES.IDLE]:             { loop: true },
    [PET_STATES.WAVE]:             { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.GLASSES]:          { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.ABILITY]:          { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.SLEEP_TRANSITION]: { loop: false, next: PET_STATES.SLEEP },
    [PET_STATES.SLEEP]:            { loop: true },
    [PET_STATES.WAKE]:             { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.RUN]:              { loop: true },
    [PET_STATES.JUMP]:             { loop: false, next: PET_STATES.SIT },
    [PET_STATES.SIT]:              { loop: true },
    [PET_STATES.EAT]:              { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.INFINITY]:         { loop: true },
    [PET_STATES.DANCE]:            { loop: true },
    [PET_STATES.STRETCH]:          { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.LOOK_AROUND]:      { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.PHONE]:            { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.FALL]:             { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.PICKUP]:           { loop: false, next: PET_STATES.RUN },
    [PET_STATES.POPPER]:           { loop: false, next: PET_STATES.IDLE },
  };

  // Weighted personality table — (weight, state, minIdleMs before it can fire)
  // Weight total = 100. Higher = more frequent.
  const PERSONALITY_TABLE = [
    { weight: 6,  state: PET_STATES.PICKUP,      minIdleMs: 0 },
    { weight: 14, state: PET_STATES.GLASSES,     minIdleMs: 0 },
    { weight: 12, state: PET_STATES.STRETCH,     minIdleMs: 5000 },
    { weight: 10, state: PET_STATES.PHONE,       minIdleMs: 0 },
    { weight: 10, state: PET_STATES.LOOK_AROUND, minIdleMs: 0 },
    { weight: 10, state: PET_STATES.WAVE,        minIdleMs: 0 },
    { weight: 8,  state: PET_STATES.ABILITY,     minIdleMs: 15000 },
    { weight: 6,  state: PET_STATES.DANCE,       minIdleMs: 20000 },
    { weight: 4,  state: PET_STATES.FALL,        minIdleMs: 30000 }, // rare stumble
    { weight: 20, state: null },                                      // natural pause
  ];
  const PERSONALITY_TOTAL = PERSONALITY_TABLE.reduce((s, e) => s + e.weight, 0);

  class AnimController {
    constructor(renderer, options = {}) {
      this.renderer = renderer;
      this.currentState = PET_STATES.IDLE;
      this.inactivityMs  = options.inactivityMs    || 45000;
      this.personalityMinMs = options.personalityMinMs || 8000;
      this.personalityMaxMs = options.personalityMaxMs || 18000;
      this.lastInteractionAt = performance.now();
      this.nextPersonalityAt = this.lastInteractionAt + this.randomPersonalityDelay();
      this.holdingItem = false;
      this._lastPersonalityFiredAt = 0;
      this._lastStateEnteredAt = 0;
      // Per-state last-fired trackers to implement minIdleMs
      this._lastFiredState = {};
      this.renderer.setPlaybackEndHandler((state) => this.handlePlaybackEnd(state));
    }

    start(now = performance.now()) {
      this.lastInteractionAt = now;
      this.schedulePersonality(now);
      this.enter(PET_STATES.IDLE);
    }

    update(now = performance.now()) {
      // Only tick personality when in an interruptible state and not sleeping
      if (!INTERRUPTIBLE.has(this.currentState) || this.isSleeping()) return;
      if (this.holdingItem) return;

      // Inactivity → stretch → sleep pipeline
      const idleMs = now - this.lastInteractionAt;
      if (idleMs >= this.inactivityMs) {
        if (idleMs >= this.inactivityMs + 12000) {
          this.request(PET_STATES.SLEEP_TRANSITION);
        } else if (this.currentState === PET_STATES.IDLE) {
          this.request(PET_STATES.STRETCH);
        }
        return;
      }

      // Personality timer: fire when due, with a shorter global cooldown (3s)
      if (now >= this.nextPersonalityAt) {
        const cooldownOk = now - this._lastPersonalityFiredAt >= 3000;
        if (cooldownOk) {
          this._firePersonality(now);
        }
        this.schedulePersonality(now);
      }
    }

    _firePersonality(now) {
      this._lastPersonalityFiredAt = now;

      // Roll weighted random
      let roll = Math.random() * PERSONALITY_TOTAL;
      for (const entry of PERSONALITY_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) {
          if (!entry.state) return; // natural pause

          // Check per-state minIdleMs cooldown
          const lastFired = this._lastFiredState[entry.state] || 0;
          if (entry.minIdleMs && now - lastFired < entry.minIdleMs) {
            // Skip this one, just stay idle
            return;
          }

          if (entry.state === PET_STATES.PICKUP) {
            this.holdingItem = true;
          }
          if (this.request(entry.state)) {
            this._lastFiredState[entry.state] = now;
          }
          return;
        }
      }
    }

    noteInteraction(now = performance.now()) {
      this.lastInteractionAt = now;
      if (INTERRUPTIBLE.has(this.currentState)) {
        this.schedulePersonality(now);
      }
    }

    handleSingleClick(now = performance.now()) {
      this.noteInteraction(now);
      if (this.holdingItem) {
        this.holdingItem = false;
        return this.request(PET_STATES.GLASSES, { force: true });
      }
      if (this.isSleeping()) {
        return this.request(PET_STATES.WAKE, { force: true });
      }
      if (this.currentState === PET_STATES.SIT) {
        return this.request(PET_STATES.IDLE, { force: true });
      }
      return this.request(PET_STATES.WAVE);
    }

    handleDoubleClick(now = performance.now()) {
      this.noteInteraction(now);
      if (this.isSleeping()) {
        return this.request(PET_STATES.WAKE, { force: true });
      }
      if (this.currentState === PET_STATES.SIT) {
        return this.request(PET_STATES.IDLE, { force: true });
      }
      return this.request(PET_STATES.ABILITY);
    }

    request(state, { force = false } = {}) {
      if (!STATE_CONFIG[state]) return false;

      if (!force) {
        if (!this.canInterrupt()) return false;
        if (this.isSleeping() && state !== PET_STATES.WAKE) return false;
        if (state === this.currentState && STATE_CONFIG[state].loop) return false;
      }

      this.enter(state);
      return true;
    }

    enter(state) {
      this.currentState = state;
      this._lastStateEnteredAt = performance.now();
      if (state === PET_STATES.IDLE) {
        // When returning to idle, schedule next personality sooner (4–10s) for livelier feel
        this.nextPersonalityAt = performance.now() + 4000 + Math.random() * 6000;
      }
      this.renderer.play(state, { loop: STATE_CONFIG[state].loop });
    }

    render(now) {
      this.renderer.render(now);
    }

    isSleeping() {
      return (
        this.currentState === PET_STATES.SLEEP ||
        this.currentState === PET_STATES.SLEEP_TRANSITION
      );
    }

    canInterrupt() {
      return INTERRUPTIBLE.has(this.currentState);
    }

    handlePlaybackEnd(state) {
      if (state !== this.currentState) return;
      const nextState = STATE_CONFIG[state]?.next || PET_STATES.IDLE;
      this.enter(nextState);
    }

    schedulePersonality(now) {
      this.nextPersonalityAt = now + this.randomPersonalityDelay();
    }

    randomPersonalityDelay() {
      const span = Math.max(0, this.personalityMaxMs - this.personalityMinMs);
      return this.personalityMinMs + Math.random() * span;
    }
  }

  ns.PET_STATES = PET_STATES;
  ns.STATE_CONFIG = STATE_CONFIG;
  ns.AnimController = AnimController;
})();

