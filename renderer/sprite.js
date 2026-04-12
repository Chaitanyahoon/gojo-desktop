(() => {
  const ns = (window.GojoPet = window.GojoPet || {});

  const WINDOW_W = 120;
  const WINDOW_H = 180;
  const SAMPLE_STEP = 4;
  const BACKGROUND_MIN_LUMA = 55;
  const BACKGROUND_MAX_CHROMA = 35;
  const BACKGROUND_DISTANCE = 50;
  const EDGE_LUMA_THRESHOLD = 35;
  const PROTECTION_RADIUS = 0;

  const CLIPS = {
    IDLE: {
      src: "../reference_frames/idle.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    WAVE: {
      src: "../reference_frames/wave.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    GLASSES: {
      src: "../reference_frames/glass-shift.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    ABILITY: {
      src: "../reference_frames/ability-use.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 72, y: 110 },
      sleepAnchor: { x: 84, y: 88 },
    },
    SLEEP_TRANSITION: {
      src: "../reference_frames/sleep_transition.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 58, y: 8 },
      effect: { x: 62, y: 116 },
      sleepAnchor: { x: 78, y: 88 },
    },
    SLEEP: {
      src: "../reference_frames/sleep.mp4",
      crop: { sx: 0, sy: 118, sw: 496, sh: 520 },
      dest: { dx: 0, dy: 48, dw: 120, dh: 118 },
      anchor: { x: 52, y: 70 },
      effect: { x: 64, y: 132 },
      sleepAnchor: { x: 86, y: 80 },
    },
    WAKE: {
      src: "../reference_frames/wakeup-transition.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    RUN: {
      src: "../reference_frames/run.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    JUMP: {
      src: "../reference_frames/jump.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    SIT: {
      src: "../reference_frames/active-window-sitting.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    EAT: {
      src: "../reference_frames/catching.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    INFINITY: {
      src: "../reference_frames/infinity.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    DANCE: {
      src: "../reference_frames/music-reaction.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    STRETCH: {
      src: "../reference_frames/stretch.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    LOOK_AROUND: {
      src: "../reference_frames/look-around.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    PHONE: {
      src: "../reference_frames/phone.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    FALL: {
      src: "../reference_frames/fall.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    PICKUP: {
      src: "../reference_frames/pickup.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
    POPPER: {
      src: "../reference_frames/popper.mp4",
      crop: { sx: 0, sy: 34, sw: 496, sh: 690 },
      dest: { dx: 4, dy: 2, dw: 112, dh: 156 },
      anchor: { x: 60, y: 5 },
      effect: { x: 60, y: 112 },
      sleepAnchor: { x: 84, y: 88 },
    },
  };

  class SpriteRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { willReadFrequently: true });
      this.maskCanvas = document.createElement("canvas");
      this.maskCanvas.width = canvas.width;
      this.maskCanvas.height = canvas.height;
      this.maskCtx = this.maskCanvas.getContext("2d", { willReadFrequently: true });

      // Dual work canvases for cross-fade blending
      this.workCanvas = document.createElement("canvas");
      this.workCanvas.width = canvas.width;
      this.workCanvas.height = canvas.height;
      this.workCtx = this.workCanvas.getContext("2d", { willReadFrequently: true });
      this.workCanvasB = document.createElement("canvas");
      this.workCanvasB.width = canvas.width;
      this.workCanvasB.height = canvas.height;
      this.workCtxB = this.workCanvasB.getContext("2d", { willReadFrequently: true });

      this.ctx.imageSmoothingEnabled = false;
      this.maskCtx.imageSmoothingEnabled = false;
      this.workCtx.imageSmoothingEnabled = false;
      this.workCtxB.imageSmoothingEnabled = false;
      this.canvas.style.backgroundColor = "transparent";

      this.currentClip = "IDLE";
      this.currentFlip = false;
      this.currentRotation = 0;
      this.onPlaybackEnd = null;

      // Double-buffer video pool for cross-fade
      this.videoActive = this.createVideo();   // currently visible
      this.videoPending = this.createVideo();  // loading next clip
      this.activeClip = "IDLE";
      this.pendingClip = null;
      this.activeToken = 0;
      this.activeSrc = "";

      // Cross-fade state
      this.FADE_MS = 220;
      this.fadeProgress = 1; // 0 = full A, 1 = full active (done)
      this.fading = false;
    }

    createVideo() {
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.playsInline = true;
      video.preload = "auto";
      video.style.position = "absolute";
      video.style.visibility = "hidden";
      video.style.pointerEvents = "none";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0";
      video.addEventListener("error", (event) => {
        console.error("Video load error", event, video.currentSrc || video.src);
      });
      document.body.appendChild(video);
      return video;
    }

    setPlaybackEndHandler(handler) {
      this.onPlaybackEnd = handler;
    }

    play(state, options = {}) {
      const clipName = state in CLIPS ? state : "IDLE";
      const clip = CLIPS[clipName];
      const src = new URL(clip.src, document.baseURI).href;

      // Nothing changed — same src already playing
      if (src === this.activeSrc && clipName === this.activeClip) {
        this.videoActive.loop = Boolean(options.loop);
        return;
      }

      this.currentClip = clipName;
      this.pendingClip = clipName;

      const token = ++this.activeToken;
      const pending = this.videoPending;
      pending.loop = Boolean(options.loop);

      const startFade = () => {
        if (token !== this.activeToken) return;
        try { pending.currentTime = 0; } catch {}
        const p = pending.play();
        if (p?.catch) p.catch(() => {});

        // Swap: pending becomes active, active becomes pending (for next transition)
        const oldActive = this.videoActive;
        this.videoActive = pending;
        this.videoPending = oldActive;
        this.activeClip = clipName;
        this.activeSrc = src;

        // Set up end handler on new active video
        this.videoActive.onended = () => {
          if (this.currentClip === clipName && this.onPlaybackEnd) {
            this.onPlaybackEnd(clipName);
          }
        };

        // Kick off cross-fade
        this.fading = true;
        this.fadeProgress = 0;
        this._fadeStartTime = performance.now();
      };

      pending.pause();

      const timeoutId = setTimeout(() => {
        if (token !== this.activeToken) return;
        startFade();
      }, 2500);

      const readyHandler = () => {
        clearTimeout(timeoutId);
        if (token !== this.activeToken) return;
        startFade();
      };

      pending.addEventListener("loadeddata", readyHandler, { once: true });
      pending.addEventListener("canplaythrough", readyHandler, { once: true });

      pending.src = src;
      pending.load();
    }

    // Called every frame from pet.js loop — advances cross-fade
    tickFade(now) {
      if (!this.fading) return;
      const elapsed = now - (this._fadeStartTime || now);
      this.fadeProgress = Math.min(1, elapsed / this.FADE_MS);
      if (this.fadeProgress >= 1) {
        this.fading = false;
      }
    }

    render(now) {
      this.tickFade(now || performance.now());
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
      this.drawShadow(this.ctx, this.currentClip);
      this.drawShadow(this.maskCtx, this.currentClip);
      this.drawVideoFrame();
    }

    drawVideoFrame() {
      const activeReady = this.videoActive.readyState >= 2;
      if (!activeReady) return;

      const clip = CLIPS[this.currentClip] || CLIPS.IDLE;
      const { crop, dest } = clip;

      // Draw active (new) video into workCanvas
      this.workCtx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
      this.workCtx.drawImage(
        this.videoActive,
        crop.sx, crop.sy, crop.sw, crop.sh,
        dest.dx, dest.dy, dest.dw, dest.dh
      );
      const frameActive = this.workCtx.getImageData(0, 0, this.workCanvas.width, this.workCanvas.height);
      this.removeBackground(frameActive);
      this.workCtx.putImageData(frameActive, 0, 0);

      // During a cross-fade, also process the pending (old) video
      let blendOld = this.fading && this.videoPending.readyState >= 2;
      if (blendOld) {
        // Use the clip that was previously active for crop/dest
        const oldClipName = this.activeSrc ? (this.pendingClip || "IDLE") : "IDLE";
        // Fallback: use current clip's dims for old video — this is fine visually
        this.workCtxB.clearRect(0, 0, this.workCanvasB.width, this.workCanvasB.height);
        this.workCtxB.drawImage(
          this.videoPending,
          crop.sx, crop.sy, crop.sw, crop.sh,
          dest.dx, dest.dy, dest.dw, dest.dh
        );
        const frameOld = this.workCtxB.getImageData(0, 0, this.workCanvasB.width, this.workCanvasB.height);
        this.removeBackground(frameOld);
        this.workCtxB.putImageData(frameOld, 0, 0);
      }

      this.ctx.save();
      // Pivot around the character's feet for rotation
      this.ctx.translate(60, 160);

      if (this.currentFlip) {
        this.ctx.scale(-1, 1);
      }
      if (this.currentRotation) {
        this.ctx.rotate(this.currentRotation);
      }

      // Draw old frame fading out
      if (blendOld && this.fadeProgress < 1) {
        this.ctx.globalAlpha = 1 - this.fadeProgress;
        this.ctx.drawImage(this.workCanvasB, -60, -160);
      }

      // Draw new frame fading in
      this.ctx.globalAlpha = this.fading ? this.fadeProgress : 1;
      this.ctx.drawImage(this.workCanvas, -60, -160);
      this.ctx.globalAlpha = 1;

      // Check if he stole a desktop file!
      if (window.GojoPet.animator && window.GojoPet.animator.holdingItem) {
          // Draw the mini folder over his shoulder
          this.ctx.translate(15, -75);
          this.ctx.rotate(0.2); // Slightly tilted

          this.ctx.fillStyle = "#FFD166"; // File back
          this.ctx.beginPath();
          this.ctx.moveTo(-15, -10);
          this.ctx.lineTo(-5, -10);
          this.ctx.lineTo(0, -5);
          this.ctx.lineTo(15, -5);
          this.ctx.lineTo(15, 10);
          this.ctx.lineTo(-15, 10);
          this.ctx.fill();

          this.ctx.fillStyle = "#F5B041"; // File front
          this.ctx.beginPath();
          this.ctx.moveTo(-15, -5);
          this.ctx.lineTo(15, -5);
          this.ctx.lineTo(12, 10);
          this.ctx.lineTo(-18, 10);
          this.ctx.fill();
      }

      this.ctx.restore();
      
      this.drawMask(frameActive);
    }

    removeBackground(image) {
      const { width, height, data } = image;
      const background = this.collectBackgroundSamples(data, width, height);
      const protectedMask = this.buildProtectionMask(data, width, height, background);
      const visited = new Uint8Array(width * height);
      const backgroundMask = new Uint8Array(width * height);
      const queue = [];
      let queueIndex = 0;
      const enqueue = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) {
          return;
        }
        const index = y * width + x;
        if (visited[index]) {
          return;
        }
        const offset = index * 4;
        if (
          !this.isBackgroundPixel(
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
            background
          )
        ) {
          return;
        }
        if (protectedMask[index]) {
          return;
        }
        visited[index] = 1;
        queue.push(index);
      };

      for (let x = 0; x < width; x += 1) {
        enqueue(x, 0);
        enqueue(x, height - 1);
      }
      for (let y = 0; y < height; y += 1) {
        enqueue(0, y);
        enqueue(width - 1, y);
      }

      while (queueIndex < queue.length) {
        const index = queue[queueIndex];
        queueIndex += 1;
        const x = index % width;
        const y = Math.floor(index / width);
        backgroundMask[index] = 1;
        enqueue(x - 1, y);
        enqueue(x + 1, y);
        enqueue(x, y - 1);
        enqueue(x, y + 1);
      }

      this.contractBackgroundMask(backgroundMask, protectedMask, width, height);

      for (let index = 0; index < backgroundMask.length; index += 1) {
        if (!backgroundMask[index]) {
          continue;
        }
        data[index * 4 + 3] = 0;
      }

      // Alpha-fade pass: soften edges of non-removed pixels that border removed pixels.
      // This creates a smooth anti-aliased cutout instead of a hard grey fringe.
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const index = y * width + x;
          if (backgroundMask[index]) {
            continue; // already removed
          }
          const offset = index * 4;
          if (data[offset + 3] === 0) {
            continue; // already transparent
          }

          // Count how many of the 8 neighbors are removed background
          let removedNeighbors = 0;
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              if (ox === 0 && oy === 0) continue;
              if (backgroundMask[index + oy * width + ox]) {
                removedNeighbors += 1;
              }
            }
          }

          if (removedNeighbors === 0) {
            continue; // interior pixel, leave untouched
          }

          // This pixel borders the removed area — compute how background-like it is
          const r = data[offset];
          const g = data[offset + 1];
          const b = data[offset + 2];
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);

          // Distance to average background color
          const dist = Math.max(
            Math.abs(r - background.average.r),
            Math.abs(g - background.average.g),
            Math.abs(b - background.average.b)
          );

          // Fade based on similarity to background: closer = more transparent
          // Pixels very close to background get fully removed
          // Pixels somewhat close get partially transparent (anti-aliased edge)
          const fadeThreshold = BACKGROUND_DISTANCE + 30;
          if (dist < fadeThreshold && chroma <= BACKGROUND_MAX_CHROMA + 10) {
            const alpha = Math.round(255 * Math.max(0, (dist - BACKGROUND_DISTANCE * 0.5)) / (fadeThreshold - BACKGROUND_DISTANCE * 0.5));
            data[offset + 3] = Math.min(data[offset + 3], alpha);
          }
        }
      }
    }

    collectBackgroundSamples(data, width, height) {
      const samples = [];
      const average = { r: 0, g: 0, b: 0 };

      // Find the bounding box of opaque pixels (the actual drawn content area)
      let minX = width, maxX = 0, minY = height, maxY = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const a = data[((y * width) + x) * 4 + 3];
          if (a > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Fallback if no opaque pixels found
      if (minX > maxX || minY > maxY) {
        return {
          samples: [{ r: 255, g: 255, b: 255 }],
          average: { r: 255, g: 255, b: 255 },
        };
      }

      const pushSample = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) {
          return;
        }
        const offset = (y * width + x) * 4;
        const a = data[offset + 3];
        if (a === 0) {
          return;
        }
        const sample = {
          r: data[offset],
          g: data[offset + 1],
          b: data[offset + 2],
        };
        samples.push(sample);
        average.r += sample.r;
        average.g += sample.g;
        average.b += sample.b;
      };

      const sampleBorder = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) {
          return;
        }
        const offset = (y * width + x) * 4;
        const a = data[offset + 3];
        if (a === 0) {
          return;
        }
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (chroma > BACKGROUND_MAX_CHROMA + 24 || luma < BACKGROUND_MIN_LUMA - 30) {
          return;
        }
        pushSample(x, y);
      };

      // Sample from the top and bottom edges of the content bounding box
      for (let x = minX; x <= maxX; x += SAMPLE_STEP) {
        pushSample(x, minY);
        pushSample(x, maxY);
      }

      // Sample from the left and right edges of the content bounding box
      const edgePadding = Math.min(20, Math.floor((maxY - minY) / 8));
      for (let y = minY + edgePadding; y <= maxY - edgePadding; y += SAMPLE_STEP) {
        sampleBorder(minX, y);
        sampleBorder(maxX, y);
      }

      if (!samples.length) {
        samples.push({ r: 255, g: 255, b: 255 });
        average.r = 255;
        average.g = 255;
        average.b = 255;
      }

      const total = samples.length;
      return {
        samples,
        average: {
          r: Math.round(average.r / total),
          g: Math.round(average.g / total),
          b: Math.round(average.b / total),
        },
      };
    }

    buildProtectionMask(data, width, height, background) {
      const total = width * height;
      let current = new Uint8Array(total);
      let next = new Uint8Array(total);

      for (let index = 0; index < total; index += 1) {
        const offset = index * 4;
        const a = data[offset + 3];
        if (a === 0) {
          continue;
        }

        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        if (!this.isBackgroundPixel(r, g, b, a, background)) {
          current[index] = 1;
        }
      }

      for (let step = 0; step < PROTECTION_RADIUS; step += 1) {
        next.set(current);
        for (let y = 1; y < height - 1; y += 1) {
          for (let x = 1; x < width - 1; x += 1) {
            const index = y * width + x;
            if (current[index]) {
              continue;
            }

            let neighbors = 0;
            for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
              for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
                if (offsetX === 0 && offsetY === 0) {
                  continue;
                }
                if (current[index + offsetY * width + offsetX]) {
                  neighbors += 1;
                }
              }
            }

            if (neighbors >= 2) {
              next[index] = 1;
            }
          }
        }

        const swap = current;
        current = next;
        next = swap;
      }

      return current;
    }

    contractBackgroundMask(backgroundMask, protectedMask, width, height) {
      const next = backgroundMask.slice();

      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const index = y * width + x;
          if (!backgroundMask[index] || protectedMask[index]) {
            continue;
          }

          let protectedNeighbors = 0;
          for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
            for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
              if (offsetX === 0 && offsetY === 0) {
                continue;
              }
              if (protectedMask[index + offsetY * width + offsetX]) {
                protectedNeighbors += 1;
              }
            }
          }

          if (protectedNeighbors >= 3) {
            next[index] = 0;
          }
        }
      }

      backgroundMask.set(next);
    }

    isBackgroundPixel(r, g, b, a, background) {
      if (a === 0) {
        return true;
      }

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = max - min;
      if (chroma > BACKGROUND_MAX_CHROMA) {
        return false;
      }
      if (luma < 60) {
        // Enforce a strict minimum luma so dark subject pixels (e.g. uniform Luma ~44)
        // are never swallowed even if they fall within distance of a dark edge sample.
        return false;
      }

      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < background.samples.length; index += 1) {
        const sample = background.samples[index];
        const distance = Math.max(
          Math.abs(r - sample.r),
          Math.abs(g - sample.g),
          Math.abs(b - sample.b)
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
        }
      }

      if (nearestDistance <= BACKGROUND_DISTANCE) {
        return true;
      }

      const averageDistance = Math.max(
        Math.abs(r - background.average.r),
        Math.abs(g - background.average.g),
        Math.abs(b - background.average.b)
      );

      if (luma >= BACKGROUND_MIN_LUMA && chroma <= BACKGROUND_MAX_CHROMA && averageDistance <= BACKGROUND_DISTANCE) {
        return true;
      }

      if (luma > BACKGROUND_MIN_LUMA + 8 && chroma <= 26 && averageDistance <= BACKGROUND_DISTANCE + 16) {
        return true;
      }

      if (luma > BACKGROUND_MIN_LUMA - 10 && chroma <= 20 && averageDistance <= BACKGROUND_DISTANCE + 24) {
        return true;
      }

      return false;
    }

    touchesSubjectEdge(x, y, data, width, height, samples) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }
          const sampleX = x + offsetX;
          const sampleY = y + offsetY;
          if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) {
            continue;
          }
          const sampleOffset = (sampleY * width + sampleX) * 4;
          const alpha = data[sampleOffset + 3];
          if (alpha === 0) {
            continue;
          }
          const r = data[sampleOffset];
          const g = data[sampleOffset + 1];
          const b = data[sampleOffset + 2];
          if (this.isBackgroundPixel(r, g, b, alpha, samples)) {
            continue;
          }
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (luma <= EDGE_LUMA_THRESHOLD) {
            return true;
          }
        }
      }
      return false;
    }

    drawMask(frame) {
      const mask = this.maskCtx.createImageData(frame.width, frame.height);
      for (let index = 0; index < frame.data.length; index += 4) {
        const alpha = frame.data[index + 3];
        mask.data[index] = 255;
        mask.data[index + 1] = 255;
        mask.data[index + 2] = 255;
        mask.data[index + 3] = alpha;
      }
      this.maskCtx.putImageData(mask, 0, 0);
    }

    drawShadow(ctx, clipName) {
      ctx.save();
      ctx.globalAlpha = clipName === "SLEEP" ? 0.18 : 0.22;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      if (clipName === "SLEEP") {
        ctx.ellipse(60, 166, 24, 6, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(60, 171, 17, 5, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    hitTest(x, y) {
      const sample = this.maskCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      return sample[3] > 0;
    }

    getBubbleAnchor(windowPosition) {
      const anchor = CLIPS[this.currentClip]?.anchor || CLIPS.IDLE.anchor;
      return {
        x: windowPosition.x + anchor.x,
        y: windowPosition.y + anchor.y,
      };
    }

    getEffectCenter() {
      return CLIPS[this.currentClip]?.effect || CLIPS.IDLE.effect;
    }

    getSleepParticleAnchor() {
      return CLIPS[this.currentClip]?.sleepAnchor || CLIPS.SLEEP.sleepAnchor;
    }
  }

  ns.SpriteConfig = {
    WINDOW_W,
    WINDOW_H,
  };
  ns.SpriteRenderer = SpriteRenderer;
})();
