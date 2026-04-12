const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getEnvironment: () => ipcRenderer.invoke("pet:get-environment"),
  getCursor: () => ipcRenderer.invoke("pet:get-cursor"),
  setPetPosition: (position) => ipcRenderer.invoke("pet:set-position", position),
  setMousePassthrough: (ignore) =>
    ipcRenderer.invoke("pet:set-ignore-mouse-events", ignore),
  showBubble: (payload) => ipcRenderer.invoke("pet:show-bubble", payload),
  updateBubblePosition: (anchor) =>
    ipcRenderer.invoke("pet:update-bubble-position", anchor),
  hideBubble: () => ipcRenderer.invoke("pet:hide-bubble"),
  showContextMenu: () => ipcRenderer.invoke("pet:show-context-menu"),
  getSettings: () => ipcRenderer.invoke("store:get-settings"),
  updateSettings: (patch) => ipcRenderer.invoke("store:update-settings", patch),
  getStats: () => ipcRenderer.invoke("store:get-stats"),
  updateStats: (patch) => ipcRenderer.invoke("store:update-stats", patch),
  openSettings: () => ipcRenderer.invoke("settings:open"),
  quit: () => ipcRenderer.invoke("app:quit"),
  onMenuAction: (callback) =>
    ipcRenderer.on("menu:action", (_, action) => callback(action)),
  onSettingsUpdated: (callback) =>
    ipcRenderer.on("settings:updated", (_, settings) => callback(settings)),
  onEnvironmentUpdated: (callback) =>
    ipcRenderer.on("environment:updated", (_, environment) => callback(environment)),
  onBubbleShow: (callback) =>
    ipcRenderer.on("bubble:show", (_, payload) => callback(payload)),
  onBubbleHide: (callback) => ipcRenderer.on("bubble:hide", () => callback()),
  resizeBubble: (size) => ipcRenderer.send("bubble:resize", size),
  hideBubbleWindow: () => ipcRenderer.send("bubble:hide-window"),
  submitChat: (text) => ipcRenderer.invoke("ai:chat-submit", text),
  closeChat: () => ipcRenderer.invoke("ai:chat-close"),
  // HUD
  showHud: (stats) => ipcRenderer.invoke("hud:show", stats),
  hideHud: () => ipcRenderer.invoke("hud:hide"),
  onHudShow: (callback) => ipcRenderer.on("hud:show", (_, stats) => callback(stats)),
  onHudHide: (callback) => ipcRenderer.on("hud:hide", () => callback()),
  onHudUpdate: (callback) => ipcRenderer.on("hud:update", (_, stats) => callback(stats)),
  // Proactive AI
  proactiveAI: () => ipcRenderer.invoke("ai:proactive"),
});

window.onerror = (message, source, lineno, colno, error) => {
  ipcRenderer.send("client-error", { message, source, lineno, colno, stack: error?.stack });
};
const ogError = console.error;
console.error = (...args) => {
  ipcRenderer.send("client-error", { message: args.join(" ") });
  ogError(...args);
};

