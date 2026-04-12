const fs = require("fs");
const path = require("path");
const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Menu,
  nativeImage,
  session,
} = require("electron");
const Store = require("electron-store").default;
const AutoLaunch = require("auto-launch");
const { createTray } = require("./tray/tray");
const { generateGojoResponse } = require("./main/ai");

const WINDOW_SIZE = { width: 120, height: 180 };
const BUBBLE_SIZE = { width: 220, height: 100 };
const SETTINGS_SIZE = { width: 420, height: 560 };

const defaultSettings = {
  alwaysOnTop: true,
  walkSpeed: 1,
  interactionFrequency: 1,
  showSpeechBubbles: true,
  startOnLogin: false,
  volume: 0.5,
  runMode: false,
  rizzMode: false,
  geminiApiKey: "",
  birthdayName: "",
  birthdayMessage: "",
};

const defaultStats = {
  mood: 80,
  energy: 90,
  hunger: 70,
  age: 0,
  name: "Gojo Satoru",
  createdAt: Date.now(),
};

const store = new Store({
  projectName: "gojo-pet",
  defaults: {
    settings: defaultSettings,
    stats: defaultStats,
  },
});

const autoLaunch = new AutoLaunch({ name: "Gojo Satoru Pet" });

let petWindow = null;
let bubbleWindow = null;
let settingsWindow = null;
let chatWindow = null;
let hudWindow = null;
let tray = null;
let isQuitting = false;
let bubbleHideTimer = null;
const LOG_FILE = path.join(__dirname, "gojo-pet.log");

app.commandLine.appendSwitch("disable-renderer-backgrounding");

[process.stdout, process.stderr].forEach((stream) => {
  stream?.on?.("error", (error) => {
    if (error?.code === "EPIPE") {
      return;
    }
    throw error;
  });
});

function logError(message, error) {
  const detail = error?.stack || error?.message || String(error);
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n${detail}\n\n`);
  } catch {}
}

function isWindowAvailable(windowRef) {
  return Boolean(windowRef && !windowRef.isDestroyed());
}

function sendToWindow(windowRef, channel, payload) {
  if (!isWindowAvailable(windowRef) || windowRef.webContents.isDestroyed()) {
    return false;
  }

  try {
    windowRef.webContents.send(channel, payload);
    return true;
  } catch (error) {
    logError(`Failed to send ${channel}`, error);
    return false;
  }
}

function handleIpc(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      logError(`IPC handler failed: ${channel}`, error);
      return null;
    }
  });
}

function getSettings() {
  return { ...defaultSettings, ...store.get("settings") };
}

function getStats() {
  const stats = { ...defaultStats, ...store.get("stats") };
  const ageMs = Date.now() - stats.createdAt;
  stats.age = Math.max(0, Math.floor(ageMs / 86400000));
  return stats;
}

function getWorkArea() {
  return screen.getPrimaryDisplay().workArea;
}

function getEnvironment() {
  return {
    workArea: getWorkArea(),
    windowSize: WINDOW_SIZE,
    settings: getSettings(),
    stats: getStats(),
  };
}

function getInitialPetPosition() {
  const area = getWorkArea();
  return {
    x: area.x + area.width - WINDOW_SIZE.width - 20,
    y: area.y + area.height - WINDOW_SIZE.height,
  };
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#141423"/>
      <circle cx="32" cy="26" r="15" fill="#fddcb5"/>
      <path d="M17 22c4-10 10-15 15-15 7 0 13 4 16 16-4-4-8-6-14-6-7 0-11 2-17 5z" fill="#f8f8f8"/>
      <rect x="18" y="24" width="28" height="8" rx="4" fill="#1a1a2e"/>
      <path d="M24 42h16l4 12H20z" fill="#eeeeee"/>
      <path d="M22 46h20" stroke="#9b59b6" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  );
}

async function syncAutoLaunch(enabled) {
  try {
    if (enabled) {
      const isEnabled = await autoLaunch.isEnabled();
      if (!isEnabled) {
        await autoLaunch.enable();
      }
    } else {
      await autoLaunch.disable();
    }
    return true;
  } catch (error) {
    logError("Failed to sync auto-launch", error);
    return false;
  }
}

function broadcastEnvironment() {
  const env = getEnvironment();
  sendToWindow(petWindow, "environment:updated", env);
}

function broadcastSettings() {
  const settings = getSettings();
  sendToWindow(petWindow, "settings:updated", settings);
  sendToWindow(settingsWindow, "settings:updated", settings);
}

function applyAlwaysOnTop(enabled) {
  const level = enabled ? "screen-saver" : "normal";
  petWindow?.setAlwaysOnTop(enabled, level);
  bubbleWindow?.setAlwaysOnTop(enabled, level);
}

function toggleVisibility(forceShow) {
  if (!petWindow) {
    return;
  }

  const show = typeof forceShow === "boolean" ? forceShow : !petWindow.isVisible();
  if (show) {
    petWindow.showInactive();
  } else {
    petWindow.hide();
    bubbleWindow?.hide();
    hudWindow?.hide();
  }
}

function createPetWindow() {
  const position = getInitialPetPosition();
  petWindow = new BrowserWindow({
    ...WINDOW_SIZE,
    x: position.x,
    y: position.y,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  petWindow.setMenuBarVisibility(false);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.setIgnoreMouseEvents(true, { forward: true });
  petWindow.loadFile(path.join(__dirname, "renderer/index.html"));
  
  // Ensure window is visible and on top
  petWindow.showInactive();
  petWindow.setAlwaysOnTop(true, "screen-saver");

  petWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      toggleVisibility(false);
    }
  });
}

function createBubbleWindow() {
  bubbleWindow = new BrowserWindow({
    ...BUBBLE_SIZE,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: getSettings().alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  bubbleWindow.setIgnoreMouseEvents(true);
  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  bubbleWindow.loadFile(path.join(__dirname, "bubble/bubble.html"));
}

function createHudWindow() {
  const HUD_SIZE = { width: 190, height: 42 };
  hudWindow = new BrowserWindow({
    ...HUD_SIZE,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  hudWindow.setIgnoreMouseEvents(true);
  hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  hudWindow.loadFile(path.join(__dirname, "renderer/hud.html"));
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    ...SETTINGS_SIZE,
    title: "Gojo Settings",
    autoHideMenuBar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "renderer/settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
  settingsWindow.once("ready-to-show", () => {
    settingsWindow.show();
  });

  return settingsWindow;
}

function closeChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.hide();
  }
}

function createChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.show();
    chatWindow.focus();
    return chatWindow;
  }

  const bounds = petWindow ? petWindow.getBounds() : { x: 100, y: 100 };
  
  chatWindow = new BrowserWindow({
    width: 260,
    height: 44,
    x: bounds.x - 70,
    y: bounds.y - 50,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  chatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  chatWindow.loadFile(path.join(__dirname, "renderer/chat.html"));
  chatWindow.on("closed", () => {
    chatWindow = null;
  });
}

let lastBubblePos = { x: -999, y: -999 }; // Cache bubble position
function positionBubble(anchor) {
  if (!bubbleWindow || !anchor) {
    return;
  }

  // Guard against non-finite values that crash Electron's setPosition
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
    return;
  }

  const bounds = bubbleWindow.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: Math.round(anchor.x),
    y: Math.round(anchor.y),
  });
  const area = display.workArea;

  // Align the bubble dead center since the tail is at center horizontally.
  let x = Math.round(anchor.x - bounds.width / 2);
  // Position bubble right at anchor point (bottom of bubble aligns with anchor)
  let y = Math.round(anchor.y - bounds.height);

  x = Math.max(area.x + 8, Math.min(x, area.x + area.width - bounds.width - 8));
  y = Math.max(area.y + 8, Math.min(y, area.y + area.height - bounds.height - 8));

  // Only update if position actually changed (avoid unnecessary redraws)
  if (lastBubblePos.x !== x || lastBubblePos.y !== y) {
    lastBubblePos = { x, y };
    bubbleWindow.setPosition(x, y, false);
  }
}

function showBubble(payload) {
  if (!isWindowAvailable(bubbleWindow)) {
    return;
  }

  clearTimeout(bubbleHideTimer);
  bubbleHideTimer = null;

  positionBubble(payload.anchor);
  bubbleWindow.showInactive();
  sendToWindow(bubbleWindow, "bubble:show", payload);
}

function hideBubble(afterMs = 300) {
  if (!isWindowAvailable(bubbleWindow)) {
    return;
  }

  clearTimeout(bubbleHideTimer);
  sendToWindow(bubbleWindow, "bubble:hide");
  bubbleHideTimer = setTimeout(() => {
    bubbleWindow?.hide();
  }, afterMs);
}

function showPetContextMenu() {
  if (!petWindow) {
    return;
  }

  const stats = getStats();
  const currentSettings = getSettings();
  const menu = Menu.buildFromTemplate([
    {
      label: `♡ Mood: ${Math.round(stats.mood)}  ⚡ Energy: ${Math.round(stats.energy)}  🍡 Hunger: ${Math.round(stats.hunger)}`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Interact",
      submenu: [
        { label: "Feed", click: () => sendToWindow(petWindow, "menu:action", "feed") },
        { label: "Pet Him", click: () => sendToWindow(petWindow, "menu:action", "pet") },
        { label: "Say Hello", click: () => sendToWindow(petWindow, "menu:action", "hello") },
        { label: "Dance!", click: () => sendToWindow(petWindow, "menu:action", "dance") }
      ]
    },
    {
      label: "Abilities",
      submenu: [
        { label: "Unlimited Void", click: () => sendToWindow(petWindow, "menu:action", "domain") },
        { label: "Infinity", click: () => sendToWindow(petWindow, "menu:action", "infinity") },
        { label: "Hollow Purple", click: () => sendToWindow(petWindow, "menu:action", "challenge") }
      ]
    },
    { type: "separator" },
    {
      label: "Run Mode",
      type: "checkbox",
      checked: currentSettings.runMode,
      click: () => {
        const nextSettings = { ...currentSettings, runMode: !currentSettings.runMode };
        store.set("settings", nextSettings);
        broadcastSettings();
        showBubble({ text: nextSettings.runMode ? "Run mode enabled." : "Run mode disabled.", durationMs: 2000 });
      },
    },
    {
      label: "Rizz Mode",
      type: "checkbox",
      checked: currentSettings.rizzMode,
      click: () => {
        const nextSettings = { ...currentSettings, rizzMode: !currentSettings.rizzMode };
        store.set("settings", nextSettings);
        broadcastSettings();
        if (nextSettings.rizzMode) {
          // Pick a random rizz message when activated
          const rizzMessages = [
            "Hey, baby girl.",
            "You're cute. I'm cuter.",
            "Wanna see my domain expansion?",
            "I'm limitless... especially for you.",
            "You caught my eye. Literally the strongest.",
            "Ever met the strongest on the planet? Here I am.",
            "That smile of yours is weak. Let me fix that.",
            "I don't usually do this, but... hi.",
            "Power and beauty? You're looking at both.",
            "Infinity could never compare to you... actually, it could.",
            "Want to experience true strength? Stick around.",
            "I break hearts like I break barriers.",
            "Strongest sorcerer. Strongest rizz too.",
            "You're interesting. Don't disappear.",
            "Yeah, I'm that guy."
          ];
          const msg = rizzMessages[Math.floor(Math.random() * rizzMessages.length)];
          showBubble({ text: msg, durationMs: 3000 });
        } else {
          showBubble({ text: "Rizz mode disabled.", durationMs: 2000 });
        }
      },
    },
    { type: "separator" },
    {
      label: "Chat with Gojo",
      click: () => {
        createChatWindow();
      },
    },
    { type: "separator" },
    { label: "Sleep", click: () => sendToWindow(petWindow, "menu:action", "sleep") },
    { label: "Wake Up", click: () => sendToWindow(petWindow, "menu:action", "wake") },
    { label: "🎂 Happy Birthday", click: () => sendToWindow(petWindow, "menu:action", "birthday") },
    { type: "separator" },
    {
      label: "Settings...",
      click: () => {
        closeChatWindow();
        createSettingsWindow();
        sendToWindow(petWindow, "menu:action", "settings");
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  menu.popup({ window: petWindow });
}

function registerIpc() {
  handleIpc("pet:get-environment", () => getEnvironment());
  handleIpc("pet:get-cursor", () => screen.getCursorScreenPoint());
  handleIpc("pet:set-position", (_, position) => {
    const x = Number(position?.x);
    const y = Number(position?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }
    petWindow?.setPosition(Math.round(x), Math.round(y), false);
    return true;
  });
  handleIpc("pet:set-ignore-mouse-events", (_, ignore) => {
    petWindow?.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
    return true;
  });
  handleIpc("pet:show-bubble", (_, payload) => {
    showBubble(payload);
    return true;
  });
  handleIpc("pet:update-bubble-position", (_, anchor) => {
    positionBubble(anchor);
    return true;
  });
  handleIpc("pet:hide-bubble", () => {
    hideBubble();
    return true;
  });
  handleIpc("pet:show-context-menu", () => {
    showPetContextMenu();
    return true;
  });

  handleIpc("ai:chat-submit", async (_, prompt) => {
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.hide();
    }
    showBubble({ text: "...", durationMs: 0 }); // Show thinking state
    
    try {
        const settings = getSettings();
        const apiKey = settings.geminiApiKey;
        const response = await generateGojoResponse(prompt, apiKey, settings.rizzMode);
        showBubble({ text: response, durationMs: Math.max(3000, response.length * 80) });
    } catch(err) {
        const apiKey = getSettings().geminiApiKey;
        let message;
        if (!apiKey || apiKey.trim() === "") {
          message = "Need my Gemini API key\nin Settings.";
        } else if (/rate limit/i.test(err.message || "")) {
          message = "Gemini is rate-limiting right now. Try again later or use another API key.";
        } else {
          message = `Gemini request failed: ${err.message || "check your key or network."}`;
        }
        showBubble({ text: message, durationMs: 4000 });
    }
    return true;
  });

  handleIpc("ai:chat-close", () => {
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.hide();
    }
    return true;
  });

  handleIpc("store:get-settings", () => getSettings());
  handleIpc("store:update-settings", async (_, patch) => {
    const previous = getSettings();
    const next = { ...previous, ...patch };
    store.set("settings", next);
    applyAlwaysOnTop(next.alwaysOnTop);
    if (previous.startOnLogin !== next.startOnLogin) {
      await syncAutoLaunch(next.startOnLogin);
    }
    broadcastSettings();
    return next;
  });
  handleIpc("store:get-stats", () => getStats());
  handleIpc("store:update-stats", (_, patch) => {
    const next = { ...getStats(), ...patch };
    store.set("stats", next);
    return next;
  });
  handleIpc("settings:open", () => {
    createSettingsWindow();
    return true;
  });
  handleIpc("app:quit", () => {
    isQuitting = true;
    app.quit();
    return true;
  });
  handleIpc("hud:show", (_, stats) => {
    if (!isWindowAvailable(hudWindow) || !petWindow) return true;
    const petBounds = petWindow.getBounds();
    // Position above the pet's head, centered
    const hudBounds = hudWindow.getBounds();
    const x = Math.round(petBounds.x + petBounds.width / 2 - hudBounds.width / 2);
    const y = Math.round(petBounds.y - hudBounds.height - 8);
    hudWindow.setPosition(x, y, false);
    hudWindow.showInactive();
    sendToWindow(hudWindow, "hud:show", stats);
    return true;
  });
  handleIpc("hud:hide", () => {
    if (!isWindowAvailable(hudWindow)) return true;
    sendToWindow(hudWindow, "hud:hide");
    setTimeout(() => hudWindow?.hide(), 200);
    return true;
  });

  handleIpc("ai:proactive", async () => {
    const apiKey = getSettings().geminiApiKey;
    if (!apiKey) return null;
    const prompts = [
      "Say something casual and unprompted to the user you've been silently watching work.",
      "Comment on what time of day it feels like right now.",
      "Share a brief thought about what it's like being a desktop pet. Keep it Gojo-style.",
      "Say something motivating but in a trademark cocky Gojo way to someone working."
    ];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    try {
      const response = await generateGojoResponse(prompt, apiKey);
      showBubble({ text: response, durationMs: Math.max(3000, response.length * 80) });
    } catch(err) {
      logError("Proactive AI failed", err);
    }
    return true;
  });

  ipcMain.on("bubble:resize", (_, size) => {
    if (!bubbleWindow || !size) {
      return;
    }
    const width = Math.max(100, Math.min(240, Math.round(size.width)));
    const height = Math.max(40, Math.min(110, Math.round(size.height)));
    bubbleWindow.setContentSize(width, height);
  });
  ipcMain.on("bubble:hide-window", () => {
    bubbleWindow?.hide();
  });
  ipcMain.on("client-error", (_, error) => {
    console.log("CLIENT ERROR:", error);
  });
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media") {
      callback(true);
    } else {
      callback(false);
    }
  });

  registerIpc();
  createPetWindow();
  createBubbleWindow();
  createHudWindow();
  tray = createTray({
    icon: createTrayIcon(),
    onToggle: () => toggleVisibility(),
    onShow: () => toggleVisibility(true),
    onHide: () => toggleVisibility(false),
    onSettings: () => createSettingsWindow(),
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
  });

  screen.on("display-metrics-changed", broadcastEnvironment);
  screen.on("display-added", broadcastEnvironment);
  screen.on("display-removed", broadcastEnvironment);

  if (getSettings().startOnLogin) {
    await syncAutoLaunch(true);
  }

  if (process.platform === "darwin" && app.dock) {
    app.dock.hide();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("activate", () => {
  toggleVisibility(true);
});
