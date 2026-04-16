(() => {
  const defaults = {
    alwaysOnTop: true,
    walkSpeed: 1,
    interactionFrequency: 1,
    showSpeechBubbles: true,
    startOnLogin: false,
    volume: 0.5,
    birthdayName: "",
    birthdayMessage: "",
  };

  function updateKeyStatus() {
    const status = document.getElementById("geminiKeyStatus");
    const keyInput = document.getElementById("geminiApiKey");
    if (!status || !keyInput) {
      return;
    }
    status.textContent = keyInput.value.trim()
      ? "Gemini key saved."
      : "No Gemini key configured.";
  }

  async function load() {
    const settings = { ...defaults, ...(await window.electronAPI.getSettings()) };
    Object.entries(settings).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (!element) {
        return;
      }
      if (element.type === "checkbox") {
        element.checked = Boolean(value);
      } else {
        element.value = value;
      }
    });
    updateKeyStatus();
  }

  let toastTimer;
  function showToast() {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function bindControl(id) {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    const eventName = element.type === "checkbox" ? "change" : "input";
    element.addEventListener(eventName, () => {
      let value;
      if (element.type === "checkbox") {
        value = element.checked;
      } else if (element.type === "range") {
        value = Number(element.value);
      } else {
        value = element.value;
      }
      window.electronAPI.updateSettings({ [id]: value });
      if (id === "geminiApiKey") {
        updateKeyStatus();
      }
      showToast();
    });
  }

  ["alwaysOnTop", "walkSpeed", "interactionFrequency", "showSpeechBubbles", "startOnLogin", "volume", "birthdayName", "birthdayMessage", "geminiApiKey", "runMode", "rizzMode"].forEach(
    bindControl
  );

  document.getElementById("reset").addEventListener("click", () => {
    window.electronAPI.updateStats({
      mood: 80,
      energy: 90,
      hunger: 70,
      age: 0,
      createdAt: Date.now(),
    });
  });

  window.electronAPI.onSettingsUpdated((settings) => {
    Object.entries(settings).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (!element) {
        return;
      }
      if (element.type === "checkbox") {
        element.checked = Boolean(value);
      } else {
        element.value = value;
      }
    });
    updateKeyStatus();
  });

  load();
})();
