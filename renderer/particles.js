(() => {
  const ns = (window.GojoPet = window.GojoPet || {});

  class ParticleSystem {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.particles = [];
      this.time = 0;
      this.ctx.imageSmoothingEnabled = false;
    }

    spawn(type, options = {}) {
      const count = options.count || 1;
      for (let index = 0; index < count; index += 1) {
        this.particles.push({
          type,
          x: options.x || 60,
          y: options.y || 90,
          vx: (options.vx || 0) + (Math.random() - 0.5) * (options.spreadX || 1.6),
          vy: (options.vy || 0) + (Math.random() - 0.5) * (options.spreadY || 1.6),
          life: options.life || 900,
          maxLife: options.life || 900,
          text: options.text || "Z",
          color: options.color,
          size: options.size || 3,
          gravity: options.gravity || 0,
          wobble: Math.random() * Math.PI * 2,
        });
      }
    }

    update(dt) {
      this.time += dt;
      this.particles = this.particles.filter((particle) => {
        particle.life -= dt;
        particle.vy += particle.gravity * (dt / 16.6667);
        particle.x += particle.vx * (dt / 16.6667);
        particle.y += particle.vy * (dt / 16.6667);
        particle.wobble += dt * 0.01;
        return particle.life > 0;
      });
    }

    render(extra = {}) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (extra.infinity) {
        this.renderInfinityAura(extra.infinity);
      }
      if (extra.domain) {
        this.renderDomain(extra.domain);
      }

      this.particles.forEach((particle) => {
        const alpha = Math.max(0, particle.life / particle.maxLife);
        this.ctx.globalAlpha = alpha;
        const wobbleX = Math.sin(particle.wobble) * 2;
        const x = particle.x + wobbleX;
        const y = particle.y;

        if (particle.type === "zzz") {
          this.ctx.fillStyle = particle.color || "#B6BCC9";
          this.ctx.font = "bold 14px Consolas";
          this.ctx.fillText(particle.text, x, y);
        } else {
          this.drawPixelShape(particle.type, x, y, particle.color, particle.size);
        }
      });

      this.ctx.globalAlpha = 1;
    }

    drawPixelShape(type, x, y, color, size) {
      const palette = {
        heart: color || "#F47CA8",
        star: color || "#F1C40F",
        food: color || "#FFB86C",
        aura: color || "#9B59B6",
        trail: color || "#E8EFFF",
      };
      this.ctx.fillStyle = palette[type] || "#FFFFFF";
      const dot = (dx, dy) => this.ctx.fillRect(x + dx, y + dy, size, size);

      if (type === "heart") {
        dot(0, 0);
        dot(size, -size);
        dot(size * 2, 0);
        dot(size, size);
      } else if (type === "star") {
        dot(size, 0);
        dot(0, size);
        dot(size, size);
        dot(size * 2, size);
        dot(size, size * 2);
      } else if (type === "confetti") {
        const colors = ["#E74C3C", "#F1C40F", "#2ECC71", "#3498DB", "#9B59B6"];
        this.ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        this.ctx.fillRect(x, y, size + 1, size + 1);
      } else if (type === "balloon") {
        this.ctx.fillStyle = color || "#E67E22";
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - size * 1.5, size * 1.4, size * 1.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = color || "#E67E22";
        this.ctx.lineWidth = Math.max(1, size * 0.3);
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size * 0.2);
        this.ctx.lineTo(x, y + size * 2);
        this.ctx.stroke();
      } else if (type === "trail") {
        // Tiny 2px rounded-feeling dot
        this.ctx.beginPath();
        this.ctx.arc(x, y, Math.max(1, size * 0.8), 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        dot(0, 0);
        dot(size, 0);
        dot(0, size);
      }
    }

    renderInfinityAura({ x, y, radius, time }) {
      for (let index = 0; index < 8; index += 1) {
        const angle = time * 0.003 + (Math.PI * 2 * index) / 8;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius * 0.55;
        this.ctx.fillStyle = index % 2 ? "#3498DB" : "#9B59B6";
        this.ctx.fillRect(px, py, 3, 3);
      }
    }

    renderDomain({ x, y, radius, alpha }) {
      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = "#8D4BD0";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, radius, radius * 0.7, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
  }

  ns.ParticleSystem = ParticleSystem;
})();
