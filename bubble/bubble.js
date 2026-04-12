(() => {
  const bubble = document.getElementById("bubble");
  const content = document.getElementById("content");

  let hideTimer = null;
  let typeTimer = null;
  let currentPayload = null;

  function resizeToFit() {
    const width = Math.ceil(content.offsetWidth + 24);
    const height = Math.ceil(content.offsetHeight + 24);
    window.electronAPI.resizeBubble({ width, height });
  }

  function clearType() {
    clearTimeout(typeTimer);
    typeTimer = null;
  }

  function typeText(text, duration, onComplete) {
    clearType();
    content.textContent = "";

    if (!text || text.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    // Scale typing speed: short texts are slower, long texts faster so they don't drag
    const msPerChar = text.length < 30 ? 28 : text.length < 60 ? 20 : 14;
    let index = 0;

    const tick = () => {
      if (index >= text.length) {
        if (onComplete) onComplete();
        return;
      }
      content.textContent = text.slice(0, ++index);
      requestAnimationFrame(resizeToFit);
      typeTimer = setTimeout(tick, msPerChar);
    };

    tick();
  }

  function showNow(payload) {
    clearTimeout(hideTimer);
    clearType();
    currentPayload = payload;
    bubble.classList.add("visible");

    const text = payload.text || "";
    const duration = payload.duration || 3800;

    typeText(text, duration, () => {
      // Start the hide countdown only after typing finishes
      hideTimer = setTimeout(() => hide(), duration);
    });

    requestAnimationFrame(resizeToFit);
  }

  function hide() {
    clearTimeout(hideTimer);
    clearType();
    bubble.classList.remove("visible");
    setTimeout(() => {
      if (!bubble.classList.contains("visible")) {
        content.textContent = "";
        window.electronAPI.hideBubbleWindow();
      }
    }, 320);
  }

  window.electronAPI.onBubbleShow((payload) => {
    if (bubble.classList.contains("visible")) {
      // Micro-bounce to signal new message, then retype
      content.style.transform = "scale(0.88)";
      clearType();
      clearTimeout(hideTimer);
      setTimeout(() => {
        content.style.transform = "scale(1)";
        const text = payload.text || "";
        const duration = payload.duration || 3800;
        typeText(text, duration, () => {
          hideTimer = setTimeout(() => hide(), duration);
        });
        requestAnimationFrame(resizeToFit);
      }, 130);
      return;
    }
    showNow(payload);
  });

  window.electronAPI.onBubbleHide(() => {
    hide();
  });

  if (currentPayload) {
    showNow(currentPayload);
  }
})();
