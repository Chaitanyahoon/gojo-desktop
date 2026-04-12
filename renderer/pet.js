(() => {
  const ns = window.GojoPet;

  const canvas = document.getElementById("pet");
  const particlesCanvas = document.getElementById("particles");

  const sprite = new ns.SpriteRenderer(canvas);
  const animator = new ns.AnimController(sprite, {
    inactivityMs: 45000,
    personalityMinMs: 12000,
    personalityMaxMs: 25000,
  });
  ns.animator = animator; // Export for sprite rendering
  const particles = new ns.ParticleSystem(particlesCanvas);

  let settings = null;
  let stats = null;
  let physics = null;
  let environment = null;
  let lastFrame = performance.now();
  let lastWindowPosition = { x: 0, y: 0 };
  let mousePassthrough = true;
  let lastSleepParticle = 0;
  let lastBubbleUpdate = 0;
  let recentDrag = false;
  let singleClickTimer = null;
  let previousState = null;
  
  // New interaction states
  let globalCursor = null;
  let scrubAmount = 0;
  let lastScrubX = 0;
  let scrubTimer = null;
  let scrubberLastActive = 0;
  let cursorFarSince = 0;

  // Trail particle throttle
  let trailFrameCounter = 0;

  // Proactive AI
  let proactiveAITimer = null;
  let lastAIMessageAt = 0;

  // HUD
  let hudVisible = false;
  
  let jumpTargetY = null;
  let jumpStartY = 0;
  let jumpTime = 0;
  
  // Audio music detection
  let audioContext = null;
  let audioAnalyser = null;
  let audioDataArray = null;
  let lastLoudTime = 0;
  let musicTriggeredFrame = false;
  
  // Physics visual reactions
  let squishScaleX = 1.0;
  let squishScaleY = 1.0;
  
  let stealTargetX = null;

  const pointer = {
    x: 0,
    y: 0,
    interactive: false,
  };

  function setMousePassthrough(ignore) {
    if (mousePassthrough === ignore) {
      return;
    }
    mousePassthrough = ignore;
    window.electronAPI.setMousePassthrough(ignore);
  }

  function canShowBubble() {
    return Boolean(settings?.showSpeechBubbles);
  }

  function bubbleAnchor() {
    if (!physics?.pos) {
      return null;
    }

    const anchor = sprite.getBubbleAnchor(physics.pos);
    if (!Number.isFinite(anchor?.x) || !Number.isFinite(anchor?.y)) {
      return null;
    }
    return anchor;
  }

  function say(pool, text = null) {
    if (!canShowBubble()) {
      return;
    }

    const anchor = bubbleAnchor();
    if (!anchor) {
      return;
    }

    window.electronAPI.showBubble({
      text: text || ns.pickQuote(pool),
      anchor,
    });
    lastBubbleUpdate = performance.now();
  }

  function sayText(text) {
    if (!text) {
      return;
    }
    say("idle", text);
  }

  // Uses time-of-day + mood to pick the most appropriate quote pool
  function sayContextual() {
    if (!canShowBubble()) return;
    const pool = ns.pickContextualPool ? ns.pickContextualPool(stats) : "idle";
    say(pool);
  }

  function updateBubblePosition(now) {
    if (!physics || !canShowBubble() || now - lastBubbleUpdate > 4200) {
      return;
    }
    const anchor = bubbleAnchor();
    if (!anchor) {
      return;
    }
    window.electronAPI.updateBubblePosition(anchor);
  }

  function sleepParticleAnchor() {
    return sprite.getSleepParticleAnchor();
  }

  function spawnBurst(type, count = 6) {
    const center = sprite.getEffectCenter();
    particles.spawn(type, {
      x: center.x - 6,
      y: center.y - 8,
      count,
      spreadX: 2.3,
      spreadY: 2,
      vy: -1.6,
      life: 850,
    });
  }

  function handleMenuAction(action) {
    window.electronAPI.closeChat();
    const now = performance.now();
    animator.noteInteraction(now);

    if (action === "challenge" || action === "infinity" || action === "domain") {
      animator.request(ns.PET_STATES.ABILITY);
    } else if (action === "feed") {
      spawnBurst("food", 6);
      sayText("Yum.");
    } else if (action === "sleep") {
      animator.request(ns.PET_STATES.SLEEP_TRANSITION);
    } else if (action === "settings") {
      window.electronAPI.openSettings();
    } else if (action === "pet") {
      spawnBurst("heart", 8);
      sayText("You're too kind.");
      animator.request(ns.PET_STATES.GLASSES);
    } else if (action === "hello") {
      spawnBurst("star", 4);
      animator.request(ns.PET_STATES.WAVE);
    } else if (action === "wake") {
      animator.request(ns.PET_STATES.WAKE, { force: true });
    } else if (action === "dance") {
      animator.request(ns.PET_STATES.DANCE, { force: true });
      sayText("Let's go.");
      spawnBurst("star", 6);
    } else if (action === "birthday") {
      // Birthday celebration
      const name = settings?.birthdayName?.trim();
      const customMessage = settings?.birthdayMessage?.trim();
      const greeting = customMessage || `Happy Birthday${name ? `, ${name}` : "!"}`;

      // Start the popper animation
      animator.request(ns.PET_STATES.POPPER, { force: true });
      sayText("Ready?");
      
      // Delay the particle burst until the "pop" happens in the video (estimate 1.5s)
      setTimeout(() => {
        spawnBurst("confetti", 40, { spreadX: 18, spreadY: 25, vy: -4, life: 2000 });
        spawnBurst("balloon", 12, { spreadX: 10, spreadY: 15, vy: -1.5, life: 2500, color: "#E74C3C", size: 4 });
        spawnBurst("star", 20);
        sayText(greeting);
      }, 1500);

      if (stats) stats.mood = Math.min(100, stats.mood + 50);
    }
  }

  function handleStateChange(state) {
    if (state === previousState) {
      return;
    }

    previousState = state;

    if (state === ns.PET_STATES.WAVE) {
      sayText("Strongest.");
    } else if (state === ns.PET_STATES.GLASSES) {
      sayText("Looking sharp.");
    } else if (state === ns.PET_STATES.ABILITY) {
      spawnBurst("star", 8);
      sayText("Unlimited Void.");
    } else if (state === ns.PET_STATES.SLEEP_TRANSITION) {
      say("sleep");
    } else if (state === ns.PET_STATES.WAKE) {
      sayText("Back already?");
    } else if (state === ns.PET_STATES.STRETCH) {
      sayText("*stretches*");
    } else if (state === ns.PET_STATES.LOOK_AROUND) {
      sayText("Where did you go?");
    } else if (state === ns.PET_STATES.PHONE) {
      sayText("Checking messages...");
    } else if (state === ns.PET_STATES.FALL) {
      sayText("Whoa!");
    } else if (state === ns.PET_STATES.PICKUP) {
      sayText("Mine now.");
    }
  }

  function updateHoverInteraction() {
    const wasInteractive = pointer.interactive;
    pointer.interactive = sprite.hitTest(pointer.x, pointer.y);
    setMousePassthrough(!(pointer.interactive || physics.dragging));
  }

  function handleSingleClick() {
    if (recentDrag || !pointer.interactive) {
      return;
    }
    const now = performance.now();
    animator.noteInteraction(now);
    
    if (animator.isSleeping()) {
      return animator.request(ns.PET_STATES.WAKE, { force: true });
    }
    
    // Lose balance feature!
    if (animator.currentState === ns.PET_STATES.SIT) {
        sayText("Whoa!");
        return animator.request(ns.PET_STATES.IDLE, { force: true });
    }
    
    // Randomized interactions
    const rand = Math.random();
    if (rand < 0.3) {
      sayText("What is it?");
      animator.request(ns.PET_STATES.WAVE);
    } else if (rand < 0.6) {
      sayText("Haha.");
      animator.request(ns.PET_STATES.GLASSES);
    } else if (rand < 0.8) {
      spawnBurst("heart", 4);
      sayText("Did you need me?");
    } else {
      spawnBurst("star", 5);
      animator.request(ns.PET_STATES.ABILITY);
    }
  }

  function handleDoubleClick() {
    if (recentDrag || !pointer.interactive) {
      return;
    }
    spawnBurst("heart", 7);
    animator.handleDoubleClick(performance.now());
  }

  function bindEvents() {
    let mouseMovePending = false;
    window.addEventListener("mousemove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (physics.dragging) {
        // Throttle drag updates to avoid excessive physics calls
        if (!mouseMovePending) {
          mouseMovePending = true;
          requestAnimationFrame(() => {
            physics.dragTo({ x: event.screenX, y: event.screenY });
            animator.noteInteraction(performance.now());
            mouseMovePending = false;
          });
        }
      } else if (pointer.interactive) {
        // Track violent mouse movement anywhere on hit-box
        scrubAmount += Math.abs(event.clientX - lastScrubX);
        // Clear existing timer before setting new one to avoid accumulation
        if (scrubTimer) clearTimeout(scrubTimer);
        scrubTimer = setTimeout(() => { scrubAmount = 0; }, 350);
        
        if (scrubAmount > 1500) {
            scrubAmount = 0;
            scrubberLastActive = performance.now();
            spawnBurst("star", 12);
            sayText("Infinity.");
            animator.request(ns.PET_STATES.INFINITY, { force: true });
            
            if (stats) stats.mood = Math.max(0, stats.mood - 15);
        } else if (event.clientY < 80 && scrubAmount > 450) {
            // Petting mechanic (rubbing head)
            scrubAmount = 0;
            spawnBurst("heart", 6);
            sayText("Keep it up.");
            animator.request(ns.PET_STATES.GLASSES);
            
            if (stats) stats.mood = Math.min(100, stats.mood + 10);
        }
      }
      
      lastScrubX = event.clientX;
      updateHoverInteraction();
    });

    window.addEventListener("mouseleave", () => {
      pointer.interactive = false;
      if (!physics.dragging) {
        setMousePassthrough(true);
      }
    });

    window.addEventListener("mousedown", (event) => {
      if (event.button !== 0 || !sprite.hitTest(event.clientX, event.clientY)) {
        return;
      }

      physics.startDrag(
        { x: event.screenX, y: event.screenY },
        { x: event.clientX, y: event.clientY }
      );
      
      // If you grab him while he's sitting, he loses his balance!
      if (animator.currentState === ns.PET_STATES.SIT) {
          animator.request(ns.PET_STATES.IDLE, { force: true });
          sayText("Whoa!");
      }
      
      // Catch him stealing!
      if (animator.holdingItem) {
          animator.holdingItem = false;
          sayText("Hey! That's mine.");
          spawnBurst("star", 6);
          animator.request(ns.PET_STATES.GLASSES, { force: true });
      }
      
      animator.noteInteraction(performance.now());
      recentDrag = false;
      setMousePassthrough(false);
      event.preventDefault();
    });

    window.addEventListener("mouseup", () => {
      if (!physics.dragging) {
        return;
      }

      const release = physics.endDrag();
      recentDrag = true;
      setTimeout(() => {
        recentDrag = false;
      }, 220);
      
      if (physics.pos.y < environment.workArea.height * 0.45 || release.y > 6) {
        animator.request(ns.PET_STATES.FALL, { force: true });
      } else if (release.y < -5) {
        physics.jump(Math.min(-6, release.y));
      }
    });

    let lastMouseEnterAt = 0;
    window.addEventListener("mouseenter", () => {
      const now = performance.now();
      // Prevent spamming LOOK_AROUND on rapid mouse re-entry (8s cooldown)
      if (now - lastMouseEnterAt < 8000) return;
      lastMouseEnterAt = now;
      if (animator.currentState === ns.PET_STATES.IDLE && !animator.isSleeping()) {
        animator.request(ns.PET_STATES.LOOK_AROUND);
      }
    });

    window.addEventListener("click", (event) => {
      if (!sprite.hitTest(event.clientX, event.clientY)) {
        return;
      }
      clearTimeout(singleClickTimer);
      singleClickTimer = setTimeout(handleSingleClick, 180);
    });

    window.addEventListener("dblclick", (event) => {
      if (!sprite.hitTest(event.clientX, event.clientY)) {
        return;
      }
      clearTimeout(singleClickTimer);
      animator.handleDoubleClick(performance.now());
    });

    // Drag and Drop (EAT)
    window.addEventListener("dragover", (event) => {
       event.preventDefault(); // allow dropping
    });

    window.addEventListener("drop", (event) => {
       event.preventDefault();
       if (event.dataTransfer && event.dataTransfer.files.length > 0) {
           animator.request(ns.PET_STATES.EAT, { force: true });
           
           if (stats) {
               stats.hunger = Math.min(100, stats.hunger + 30);
               stats.mood = Math.min(100, stats.mood + 5);
           }
           
           sayText("Delicious.");
           spawnBurst("star", 6);
       }
    });

    window.addEventListener("contextmenu", (event) => {
      if (!sprite.hitTest(event.clientX, event.clientY)) {
        return;
      }
      event.preventDefault();
      setMousePassthrough(false);
      window.electronAPI.showContextMenu();
    });

    window.electronAPI.onMenuAction(handleMenuAction);
    window.electronAPI.onSettingsUpdated((nextSettings) => {
      settings = { ...settings, ...nextSettings };
      if (!settings.showSpeechBubbles) {
        window.electronAPI.hideBubble();
      }
    });
    window.electronAPI.onEnvironmentUpdated((nextEnvironment) => {
      environment = nextEnvironment;
      physics.setEnvironment(nextEnvironment);
      settings = { ...settings, ...nextEnvironment.settings };
    });
  }

  async function init() {
    environment = await window.electronAPI.getEnvironment();
    settings = { ...environment.settings };
    stats = await window.electronAPI.getStats();
    physics = new ns.PhysicsController(environment);
    lastWindowPosition = { ...physics.pos };

    bindEvents();
    animator.start(performance.now());
    
    // Cursor loop
    setInterval(async () => {
      globalCursor = await window.electronAPI.getCursor();
    }, 150);
    
    // Stats decay and sync loop (every 60 seconds)
    setInterval(() => {
        if (!stats) return;
        stats.hunger = Math.max(0, stats.hunger - 2);
        stats.energy = Math.max(0, stats.energy - 1);
        
        // Sleep restores energy
        if (animator.isSleeping()) {
            stats.energy = Math.min(100, stats.energy + 5);
        }
        
        window.electronAPI.updateStats({ hunger: stats.hunger, energy: stats.energy, mood: stats.mood });
    }, 60000);

    // Proactive AI: fires every 25-50 minutes unprompted
    function scheduleProactiveAI() {
      const delayMs = (25 + Math.random() * 25) * 60 * 1000;
      proactiveAITimer = setTimeout(async () => {
        const now = performance.now();
        const minutesSinceLast = (now - lastAIMessageAt) / 60000;
        if (
          canShowBubble() &&
          !animator.isSleeping() &&
          !physics.dragging &&
          minutesSinceLast > 20 &&
          animator.currentState === ns.PET_STATES.IDLE
        ) {
          lastAIMessageAt = now;
          try {
            if (window.electronAPI.proactiveAI) {
              await window.electronAPI.proactiveAI();
            } else {
              sayContextual(); // fallback if no API key
            }
          } catch {
            sayContextual();
          }
        } else {
          sayContextual(); // no key → smart contextual idle quote
        }
        scheduleProactiveAI();
      }, delayMs);
    }
    scheduleProactiveAI();

    initAudio();
    requestAnimationFrame(loop);
  }

  async function initAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioContext = new AudioContext();
      audioAnalyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(audioAnalyser);
      audioAnalyser.fftSize = 256;
      audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    } catch (err) {
      console.warn("Music detection disabled (no mic access):", err);
    }
  }

  function loop(now) {
    const dt = Math.min(40, now - lastFrame || 16.6667);
    lastFrame = now;

    animator.update(now);
    handleStateChange(animator.currentState);

    // Audio Music Detection (throttled to every 3 frames to reduce CPU)
    if (audioAnalyser && now - lastLoudTime < 5000) {
        // Only check audio if recently triggered or within detection window
        if (trailFrameCounter % 3 === 0) {
          audioAnalyser.getByteFrequencyData(audioDataArray);
          let sum = 0;
          for (let i = 0; i < audioDataArray.length; i++) {
              sum += audioDataArray[i];
          }
          let averageVolume = sum / audioDataArray.length;

          if (averageVolume > 35) { // Threshold for loud noises/music
              lastLoudTime = now;
          }
        }
    }

    if (now - lastLoudTime < 2500) {
        // Sustained noise detected
        if (!musicTriggeredFrame && (animator.currentState === ns.PET_STATES.IDLE || animator.currentState === ns.PET_STATES.RUN)) {
            animator.request(ns.PET_STATES.DANCE, { force: true });
            musicTriggeredFrame = true;
        }
    } else {
        // Silence detected for 2.5 seconds
        if (musicTriggeredFrame && animator.currentState === ns.PET_STATES.DANCE) {
            animator.request(ns.PET_STATES.IDLE, { force: true });
            musicTriggeredFrame = false;
        }
    }

    if (animator.currentState === ns.PET_STATES.SLEEP && now - lastSleepParticle > 900) {
      const sleepAnchor = sleepParticleAnchor();
      particles.spawn("zzz", {
        x: sleepAnchor.x,
        y: sleepAnchor.y,
        count: 1,
        text: "Z",
        vy: -0.8,
        spreadX: 0.8,
        spreadY: 0.2,
        life: 1400,
      });
      lastSleepParticle = now;
    }

    // Cursor repulsion (INFINITY)
    if (animator.currentState === ns.PET_STATES.INFINITY) {
        if (now - scrubberLastActive > 2500) {
            animator.request(ns.PET_STATES.IDLE, { force: true });
        } else if (globalCursor && trailFrameCounter % 2 === 0) {
            // Use multiplication instead of Math.pow for faster distance calc
            const dx = globalCursor.x - (physics.pos.x + 60);
            const dy = globalCursor.y - (physics.pos.y + 90);
            const distSq = dx * dx + dy * dy;
            if (distSq < 25000) {
                const dirX = Math.sign(physics.pos.x + 60 - globalCursor.x) || 1;
                physics.vel.x = dirX * 30; // Push him away fast
            }
        }
    }

    // Movement logic
    if (!physics.dragging && (animator.currentState === ns.PET_STATES.IDLE || animator.currentState === ns.PET_STATES.RUN)) {
      
      if (animator.holdingItem) {
          // Stolen item — run to a random hiding spot
          if (stealTargetX === null) {
              stealTargetX = physics.bounds.x + 100 + Math.random() * (physics.bounds.width - 200);
          }
          const dist = Math.abs(stealTargetX - (physics.pos.x + 60));
          
          if (dist < 40) {
              stealTargetX = physics.bounds.x + 100 + Math.random() * (physics.bounds.width - 200);
          }
          
          let speedMultiplier = 1;
          if (stats && (stats.hunger < 30 || stats.energy < 30)) speedMultiplier = 0.5;
          
          if (dist > 40) {
            physics.moveTowards(stealTargetX, dt, speedMultiplier * 1.5);
            animator.request(ns.PET_STATES.RUN);
          } else {
            physics.stopHorizontal();
            if (animator.currentState === ns.PET_STATES.RUN) {
                animator.request(ns.PET_STATES.IDLE);
            }
          }
      } else {
          stealTargetX = null;
          
          let targetX = globalCursor ? globalCursor.x : null;
          if (settings.runMode && targetX !== null) {
              const dist = Math.abs(targetX - (physics.pos.x + 60));
              let speedMult = 1.4;
              if (stats && (stats.hunger < 30 || stats.energy < 30)) speedMult = 0.9;
              if (dist > 16) {
                  physics.moveTowards(targetX, dt, speedMult);
                  animator.request(ns.PET_STATES.RUN);
              } else {
                  cursorFarSince = 0;
                  physics.stopHorizontal();
                  if (animator.currentState === ns.PET_STATES.RUN) {
                      animator.request(ns.PET_STATES.IDLE);
                  }
              }
          } else if (targetX !== null) {
              const dist = Math.abs(targetX - (physics.pos.x + 60));
              if (dist > 300) {
                  if (!cursorFarSince) cursorFarSince = now;
                  if (now - cursorFarSince > 3000) {
                      let speedMult = 0.7;
                      if (stats && (stats.hunger < 30 || stats.energy < 30)) speedMult = 0.4;
                      physics.moveTowards(targetX, dt, speedMult);
                      animator.request(ns.PET_STATES.RUN);
                  }
              } else {
                  cursorFarSince = 0;
                  physics.stopHorizontal();
                  if (animator.currentState === ns.PET_STATES.RUN) {
                      animator.request(ns.PET_STATES.IDLE);
                  }
              }
          } else {
              cursorFarSince = 0;
              physics.stopHorizontal();
              if (animator.currentState === ns.PET_STATES.RUN) {
                  animator.request(ns.PET_STATES.IDLE);
              }
          }
      }
    } else if (!physics.dragging) {
       physics.stopHorizontal();
    }

    let ignoreGravity = false;

    // Process JUMP tweening and SIT hovering
    if (animator.currentState === ns.PET_STATES.JUMP && jumpTargetY !== null) {
        jumpTime += dt;
        const progress = Math.min(1, Math.sin((jumpTime / 650) * (Math.PI / 2))); // Smooth Sine Ease-Out
        physics.pos.y = jumpStartY + (jumpTargetY - jumpStartY) * progress;
        physics.vel.y = 0; // Disable gravity via zeroing output inside this tick
        
        // Prevent renderer clipping logic from dropping him instantly if we update too fast
        physics.onGround = false; 
        ignoreGravity = true;
    } else if (animator.currentState === ns.PET_STATES.SIT) {
        // Freeze gravity
        physics.vel.y = 0;
        physics.onGround = false;
        if (jumpTargetY !== null) {
            physics.pos.y = jumpTargetY;
        }
        ignoreGravity = true;
    } else if (animator.currentState === ns.PET_STATES.INFINITY) {
        // Also freeze Y during infinity
        physics.vel.y = 0;
        physics.onGround = false;
        ignoreGravity = true;
    } else {
        jumpTargetY = null;
    }

    if (!physics.dragging && animator.currentState !== ns.PET_STATES.SIT && animator.currentState !== ns.PET_STATES.JUMP && animator.currentState !== ns.PET_STATES.INFINITY) {
         // Allow normal gravity processing inside physics.update
    }

    const { landed, wallImpact } = physics.update(dt, ignoreGravity);
    
    // Handle heavy impact bounces
    if (wallImpact && wallImpact.force > 8) {
        // Horizontally squish proportional to impact force!
        squishScaleX = Math.max(0.5, 1.0 - (wallImpact.force * 0.015));
        squishScaleY = Math.min(1.3, 1.0 + (wallImpact.force * 0.01));
        
        spawnBurst("star", Math.min(15, Math.floor(wallImpact.force / 2)));
        
        if (wallImpact.force > 22) {
            sayText("Oof!");
            if (stats) stats.mood = Math.max(0, stats.mood - 2);
        }
    }
    
    // Smoothly spring bounce scale back to normal
    squishScaleX += (1.0 - squishScaleX) * Math.min(1, dt * 0.015);
    squishScaleY += (1.0 - squishScaleY) * Math.min(1, dt * 0.015);
    
    canvas.style.transformOrigin = "bottom center";
    if (Math.abs(squishScaleX - 1.0) > 0.005 || Math.abs(squishScaleY - 1.0) > 0.005) {
        canvas.style.transform = `scale(${squishScaleX.toFixed(3)}, ${squishScaleY.toFixed(3)})`;
    } else {
        canvas.style.transform = "none";
    }
    
    // Wobble and flip updates
    let targetRotation = 0;
    if (physics.dragging) {
        targetRotation = Math.max(-0.25, Math.min(0.25, physics.vel.x * 0.015));
    } else if (!physics.onGround) {
        targetRotation = Math.max(-0.35, Math.min(0.35, physics.vel.x * 0.02));
    }
    // smoothly interpolate rotation (frame-rate independent for smoother animation)
    sprite.currentRotation += (targetRotation - sprite.currentRotation) * (1 - Math.exp(-dt * 0.012));

    if (Math.abs(physics.vel.x) > 0.1) {
        sprite.currentFlip = physics.vel.x < 0;
    } else if (globalCursor && animator.currentState === ns.PET_STATES.IDLE) {
        sprite.currentFlip = globalCursor.x < (physics.pos.x + 60);
    }

    const moved =
      Math.round(lastWindowPosition.x) !== Math.round(physics.pos.x) ||
      Math.round(lastWindowPosition.y) !== Math.round(physics.pos.y);
    if (moved && Number.isFinite(physics.pos.x) && Number.isFinite(physics.pos.y)) {
      window.electronAPI.setPetPosition(physics.pos);
      lastWindowPosition = { ...physics.pos };
    }

    animator.render(now);

    // Trail particles while running
    if (animator.currentState === ns.PET_STATES.RUN && physics.onGround) {
      if (trailFrameCounter % 5 === 0) {
        const trailX = physics.vel.x > 0 ? 20 : 95; // behind him depending on direction
        particles.spawn("trail", {
          x: trailX,
          y: 158,
          count: 1,
          vx: physics.vel.x * -0.15,
          vy: -0.3,
          spreadX: 0.6,
          spreadY: 0.3,
          life: 200,
        });
      }
      trailFrameCounter++;
    } else if (trailFrameCounter > 0) {
      trailFrameCounter++; // Keep counter ticking
    } else {
      trailFrameCounter = 0;
    }

    particles.update(dt);
    particles.render();

    updateBubblePosition(now);
    updateHoverInteraction();
    requestAnimationFrame(loop);
  }

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    clearTimeout(singleClickTimer);
    clearTimeout(scrubTimer);
    clearTimeout(proactiveAITimer);
    if (audioContext) audioContext.close();
  });

  init();
})();
