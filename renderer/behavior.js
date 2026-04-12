(() => {
  const ns = (window.GojoPet = window.GojoPet || {});

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function weightedPick(weights) {
    const total = weights.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.random() * total;

    for (const item of weights) {
      cursor -= item.weight;
      if (cursor <= 0) {
        return item.key;
      }
    }

    return weights[0].key;
  }

  class BehaviorController {
    constructor(environment) {
      this.bounds = environment.workArea;
      this.state = "idle";
      this.timer = rand(3000, 8000);
      this.targetX = null;
      this.forced = false;
    }

    setEnvironment(environment) {
      this.bounds = environment.workArea;
    }

    enter(state, duration = null) {
      this.state = state;
      if (duration !== null) {
        this.timer = duration;
        return;
      }

      if (state === "idle") {
        this.timer = rand(3000, 8000);
      } else if (state === "sit") {
        this.timer = rand(5000, 15000);
      } else if (state === "sleep") {
        this.timer = rand(6000, 10000);
      } else {
        this.timer = 0;
      }
    }

    chooseNext(stats) {
      const weights = [
        { key: "walk", weight: 40 },
        { key: "idle", weight: 30 },
        { key: "sit", weight: 20 },
        { key: "jump", weight: 10 },
      ];

      if (stats.energy < 30) {
        weights.push({ key: "sleep", weight: 40 });
        weights[0].weight = Math.max(5, weights[0].weight - 30);
      }
      if (stats.mood > 80) {
        weights.find((item) => item.key === "jump").weight += 15;
      }
      if (stats.hunger < 20) {
        weights.find((item) => item.key === "walk").weight += 10;
      }

      return weightedPick(weights);
    }

    chooseTargetX(stats) {
      if (stats.hunger < 20) {
        return Math.random() > 0.5
          ? this.bounds.x
          : this.bounds.x + this.bounds.width - 120;
      }
      return rand(this.bounds.x + 20, this.bounds.x + this.bounds.width - 140);
    }

    update(dt, context) {
      if (context.dragging || context.locked) {
        return { state: this.state };
      }

      if (this.state === "sleep") {
        if (context.stats.energy > 40 || context.wakeRequested) {
          this.enter("idle");
          return { state: "idle", changed: true };
        }
        return { state: "sleep" };
      }

      if (this.state === "walk") {
        if (this.targetX == null) {
          this.targetX = this.chooseTargetX(context.stats);
        }

        const delta = this.targetX - context.position.x;
        if (Math.abs(delta) < 6) {
          this.targetX = null;
          this.enter("idle");
          return { state: "idle", changed: true };
        }
        return { state: "walk", direction: delta > 0 ? 1 : -1 };
      }

      this.timer -= dt / Math.max(0.35, context.settings.interactionFrequency || 1);
      if (this.timer > 0) {
        return { state: this.state };
      }

      const next = this.chooseNext(context.stats);
      if (next === "jump") {
        this.enter("idle");
        return { state: "jump", changed: true };
      }

      this.enter(next);
      if (next === "walk") {
        this.targetX = this.chooseTargetX(context.stats);
      }

      return { state: next, changed: true };
    }
  }

  ns.BehaviorController = BehaviorController;
})();
