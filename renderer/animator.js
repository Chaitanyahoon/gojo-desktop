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
    // New
    STRETCH: "STRETCH",
    LOOK_AROUND: "LOOK_AROUND",
    PHONE: "PHONE",
    FALL: "FALL",
    PICKUP: "PICKUP",
    POPPER: "POPPER",
  };

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
    // New
    [PET_STATES.STRETCH]:          { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.LOOK_AROUND]:      { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.PHONE]:            { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.FALL]:             { loop: false, next: PET_STATES.IDLE },
    [PET_STATES.PICKUP]:           { loop: false, next: PET_STATES.RUN },
    [PET_STATES.POPPER]:           { loop: false, next: PET_STATES.IDLE },
  };

  class AnimController {
    constructor(renderer, options = {}) {
      this.renderer = renderer;
      this.currentState = PET_STATES.IDLE;
      this.inactivityMs = options.inactivityMs || 15000;
      this.personalityMinMs = options.personalityMinMs || 5000;
      this.personalityMaxMs = options.personalityMaxMs || 10500;
      this.lastInteractionAt = performance.now();
      this.nextPersonalityAt = this.lastInteractionAt + this.randomPersonalityDelay();
      this.holdingItem = false;
      this._lastPersonalityFiredAt = 0; // cooldown tracker
      this.renderer.setPlaybackEndHandler((state) => this.handlePlaybackEnd(state));
    }

    start(now = performance.now()) {
      this.lastInteractionAt = now;
      this.schedulePersonality(now);
      this.enter(PET_STATES.IDLE);
    }

    update(now = performance.now()) {
      if (this.currentState !== PET_STATES.IDLE) {
        return;
      }

      if (now - this.lastInteractionAt >= this.inactivityMs) {
        // After long idle, play STRETCH before sleeping
        if (now - this.lastInteractionAt >= this.inactivityMs + 12000) {
          this.request(PET_STATES.SLEEP_TRANSITION);
        } else {
          this.request(PET_STATES.STRETCH);
        }
        return;
      }

      if (now >= this.nextPersonalityAt) {
        // Enforce a minimum cooldown between personality actions
        if (now - this._lastPersonalityFiredAt < 8000) {
          this.schedulePersonality(now);
          return;
        }
        this._firePersonality(now);
        this.schedulePersonality(now);
      }
    }

    _firePersonality(now) {
      if (this.holdingItem) return; // already stealing, don't interrupt
      this._lastPersonalityFiredAt = now;

      // Weighted random personality pick — more idle gaps for natural feel
      const roll = Math.random();
      if (roll < 0.08) {
        // File steal (rare)
        this.holdingItem = true;
        this.request(PET_STATES.PICKUP);
      } else if (roll < 0.22) {
        this.request(PET_STATES.GLASSES);
      } else if (roll < 0.34) {
        this.request(PET_STATES.STRETCH);
      } else if (roll < 0.44) {
        this.request(PET_STATES.PHONE);
      } else if (roll < 0.52) {
        this.request(PET_STATES.LOOK_AROUND);
      } else if (roll < 0.58) {
        this.request(PET_STATES.WAVE);
      } else {
        // 42% chance: Stay idle — natural pause
      }
    }

    noteInteraction(now = performance.now()) {
      this.lastInteractionAt = now;
      if (this.currentState === PET_STATES.IDLE) {
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
      if (!STATE_CONFIG[state]) {
        return false;
      }

      if (!force) {
        if (!this.canInterrupt()) {
          return false;
        }
        if (this.currentState === PET_STATES.SLEEP && state !== PET_STATES.WAKE) {
          return false;
        }
        if (state === this.currentState && STATE_CONFIG[state].loop) {
          return false;
        }
      }

      this.enter(state);
      return true;
    }

    enter(state) {
      this.currentState = state;
      if (state === PET_STATES.IDLE) {
        this.schedulePersonality(performance.now());
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
      return Boolean(STATE_CONFIG[this.currentState]?.loop);
    }

    handlePlaybackEnd(state) {
      if (state !== this.currentState) {
        return;
      }

      const nextState = STATE_CONFIG[state].next || PET_STATES.IDLE;
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
