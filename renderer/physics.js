(() => {
  const ns = (window.GojoPet = window.GojoPet || {});

  const WALK_SPEED = 1.8;
  const GRAVITY = 0.6;
  const JUMP_FORCE = -14;
  const FRAME_MS = 1000 / 60;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  class PhysicsController {
    constructor(environment) {
      this.bounds = environment.workArea;
      this.windowSize = environment.windowSize;
      const initialX =
        this.bounds.x + this.bounds.width - this.windowSize.width - 20;
      const initialY = this.bounds.y + this.bounds.height - this.windowSize.height;
      this.pos = {
        x: initialX,
        y: initialY,
      };
      this.vel = { x: 0, y: 0 };
      this.onGround = true;
      this.dragging = false;
      this.dragOffset = { x: 0, y: 0 };
      this.pointerSamples = [];
    }

    get groundY() {
      return this.bounds.y + this.bounds.height - this.windowSize.height;
    }

    setEnvironment(environment) {
      this.bounds = environment.workArea;
      this.windowSize = environment.windowSize;
      if (!Number.isFinite(this.pos.x) || !Number.isFinite(this.pos.y)) {
        this.pos.x = this.bounds.x + this.bounds.width - this.windowSize.width - 20;
        this.pos.y = this.bounds.y + this.bounds.height - this.windowSize.height;
      }
      this.pos.x = clamp(
        this.pos.x,
        this.bounds.x,
        this.bounds.x + this.bounds.width - this.windowSize.width
      );
      this.pos.y = clamp(this.pos.y, this.bounds.y, this.groundY);
    }

    setWalkVelocity(direction, multiplier = 1) {
      this.vel.x = WALK_SPEED * multiplier * direction;
    }

    moveTowards(targetScreenX, dt, multiplier = 1) {
      // Calculate where the center of the pet is on the screen
      const centerScreenX = this.pos.x + 60; // 60 is half of WINDOW_SIZE.width 120
      const diff = targetScreenX - centerScreenX;
      
      // Stop moving if close enough
      if (Math.abs(diff) < 10) {
        this.vel.x *= 0.8; // decelerate smoothly
        return true; // reached target
      }
      
      // Accelerate towards target
      const direction = Math.sign(diff);
      const targetSpeed = WALK_SPEED * direction * 1.5 * multiplier; // run slightly faster when chasing
      
      // Interpolate velocity for smooth movement
      this.vel.x += (targetSpeed - this.vel.x) * 0.1 * (dt / FRAME_MS);
      return false; // still moving
    }

    stopHorizontal() {
      this.vel.x = 0;
    }

    jump(force = JUMP_FORCE) {
      this.vel.y = force;
      this.onGround = false;
    }

    startDrag(pointerScreen, offset) {
      this.dragging = true;
      this.dragOffset = offset;
      this.pointerSamples = [{ ...pointerScreen, time: performance.now() }];
      this.vel.x = 0;
      this.vel.y = 0;
      this.onGround = false;
    }

    dragTo(pointerScreen) {
      const time = performance.now();
      this.pos.x = pointerScreen.x - this.dragOffset.x;
      this.pos.y = pointerScreen.y - this.dragOffset.y;
      this.pointerSamples.push({ ...pointerScreen, time });
      this.pointerSamples = this.pointerSamples.slice(-5);
    }

    endDrag() {
      this.dragging = false;
      this.onGround = false;
      if (this.pointerSamples.length < 2) {
        return { x: 0, y: 0 };
      }

      const first = this.pointerSamples[0];
      const last = this.pointerSamples[this.pointerSamples.length - 1];
      const elapsed = Math.max(1, last.time - first.time);
      this.vel.x = ((last.x - first.x) / elapsed) * FRAME_MS * 0.85;
      this.vel.y = ((last.y - first.y) / elapsed) * FRAME_MS * 0.85;
      this.pointerSamples = [];
      return { ...this.vel };
    }

    update(dt, ignoreGravity = false) {
      if (this.dragging) {
        return { landed: false };
      }

      const scale = dt / FRAME_MS;
      let landed = false;

      if (!this.onGround) {
        if (!ignoreGravity) {
            this.vel.y += GRAVITY * scale;
        }
        this.pos.y += this.vel.y * scale;
        if (this.pos.y >= this.groundY) {
          this.pos.y = this.groundY;
          this.vel.y = 0;
          this.onGround = true;
          landed = true;
        }
      }

      this.pos.x += this.vel.x * scale;

      if (this.onGround) {
        this.vel.x *= 0.86;
        if (Math.abs(this.vel.x) < 0.05) {
          this.vel.x = 0;
        }
      }

      // Wall collision and bouncing mechanics
      let wallImpact = null;
      if (this.pos.x <= this.bounds.x) {
        this.pos.x = this.bounds.x;
        if (this.vel.x < -10) {
            wallImpact = { side: -1, force: Math.abs(this.vel.x) };
            this.vel.x = Math.abs(this.vel.x) * 0.6; // bounce right with 60% restitution
        } else {
            this.vel.x = 0;
        }
      } else if (this.pos.x >= this.bounds.x + this.bounds.width - this.windowSize.width) {
        this.pos.x = this.bounds.x + this.bounds.width - this.windowSize.width;
        if (this.vel.x > 10) {
            wallImpact = { side: 1, force: Math.abs(this.vel.x) };
            this.vel.x = -Math.abs(this.vel.x) * 0.6; // bounce left
        } else {
            this.vel.x = 0;
        }
      }

      this.pos.y = clamp(this.pos.y, this.bounds.y, this.groundY);

      return { landed, wallImpact };
    }
  }

  ns.WALK_SPEED = WALK_SPEED;
  ns.GRAVITY = GRAVITY;
  ns.JUMP_FORCE = JUMP_FORCE;
  ns.PhysicsController = PhysicsController;
})();
