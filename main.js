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
  globalShortcut,
  clipboard,
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
let birthdayWindow = null;
let contextMenuWindow = null;
let tray = null;
let isQuitting = false;
let bubbleHideTimer = null;
let clipboardPollTimer = null;
let lastClipboardText = "";
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
  // Load PNG from assets — SVG data URLs don't render on Windows tray
  const trayPngPath = path.join(__dirname, "assets", "tray32.png");
  if (require("fs").existsSync(trayPngPath)) {
    return nativeImage.createFromPath(trayPngPath);
  }
  // Fallback: try the main icon
  const iconPath = path.join(__dirname, "assets", "icon.png");
  if (require("fs").existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath);
    return img.resize({ width: 32, height: 32 });
  }
  // Last resort: 1px transparent
  return nativeImage.createEmpty();
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

function summonPet() {
  if (!petWindow) return;
  const area = getWorkArea();
  const cx = Math.round(area.x + area.width / 2 - WINDOW_SIZE.width / 2);
  const cy = Math.round(area.y + area.height - WINDOW_SIZE.height);
  petWindow.setPosition(cx, cy, false);
  petWindow.showInactive();
  petWindow.setAlwaysOnTop(true, "screen-saver");
  // Tell the pet renderer to say something after a short settle delay
  setTimeout(() => sendToWindow(petWindow, "menu:action", "hello"), 300);
}

function updateTrayTooltip() {
  if (!tray) return;
  const s = getStats();
  const tip = `Gojo Satoru Pet\nMood: ${getMoodText(s.mood)} (${Math.round(s.mood)}) | Energy: ${getEnergyText(s.energy)} (${Math.round(s.energy)}) | Hunger: ${getHungerText(s.hunger)} (${Math.round(s.hunger)})`;
  tray.setToolTip && tray.setToolTip(tip);
}

function getSeasonalGreet() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (m === 10 && d >= 25) return "Happy Halloween. I'm already the scariest thing out there.";
  if (m === 12 && d >= 24 && d <= 26) return "Merry Christmas. Even I get a break today.";
  if (m === 1 && d === 1) return "Happy New Year. Another year of being the strongest.";
  if (m === 2 && d === 14) return "Valentine's Day. Obviously someone left a gift for me.";
  return null;
}

function startClipboardPolling() {
  lastClipboardText = clipboard.readText();
  const clipboardReactions = [
    "Copying homework?",
    "Interesting... what's that for?",
    "I saw that.",
    "You copy, I judge.",
    "Bold move.",
    "Don't tell anyone I saw that.",
    "*pretends not to notice*",
  ];
  clipboardPollTimer = setInterval(() => {
    try {
      const current = clipboard.readText();
      if (current && current !== lastClipboardText && current.trim().length > 0) {
        lastClipboardText = current;
        // Only react 20% of the time to avoid being annoying
        if (Math.random() < 0.20) {
          const msg = clipboardReactions[Math.floor(Math.random() * clipboardReactions.length)];
          showBubble({ text: msg, durationMs: 2500 });
        }
      }
    } catch {}
  }, 4000);
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

function createBirthdayWindow() {
  if (birthdayWindow && !birthdayWindow.isDestroyed()) {
    birthdayWindow.focus();
    return;
  }

  const { bounds } = screen.getPrimaryDisplay();

  birthdayWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    backgroundColor: "#050208",
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  birthdayWindow.setAlwaysOnTop(true, "screen-saver");
  birthdayWindow.loadFile(path.join(__dirname, "birthday/birthday.html"));
  birthdayWindow.on("closed", () => {
    birthdayWindow = null;
    restorePetWindow();
  });
}

function restorePetWindow() {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.restore();
  petWindow.show();
  petWindow.setAlwaysOnTop(true, "screen-saver");
  petWindow.focus();
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
  if (!isWindowAvailable(bubbleWindow) || !anchor) {
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

function getMoodText(val) {
  if (val >= 80) return "😎 Perfect";
  if (val >= 50) return "🙂 Good";
  if (val >= 20) return "😐 Okay";
  return "🤬 Annoyed";
}

function getEnergyText(val) {
  if (val >= 80) return "⚡ Pumped";
  if (val >= 40) return "🔋 Normal";
  if (val >= 15) return "🪫 Low";
  return "🥱 Exhausted";
}

function getHungerText(val) {
  if (val >= 80) return "🍗 Full";
  if (val >= 40) return "🍢 Fine";
  if (val >= 15) return "🍡 Hungry";
  return "🦴 Starving";
}

function closeContextMenu() {
  if (contextMenuWindow && !contextMenuWindow.isDestroyed()) {
    contextMenuWindow.close();
    contextMenuWindow = null;
  }
}

function createContextMenuWindow(x, y, data) {
  closeContextMenu();
  const MENU_W = 260;
  const MENU_H = 440;
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  // Position: prefer right of cursor, but avoid screen edge
  let cx = x + 6;
  let cy = y;
  if (cx + MENU_W > sw - 8) cx = x - MENU_W - 6;
  if (cy + MENU_H > sh - 8) cy = sh - MENU_H - 8;
  cx = Math.max(8, cx);
  cy = Math.max(8, cy);

  // Make sure we don't overlap the pet window itself
  if (petWindow && !petWindow.isDestroyed()) {
    const pb = petWindow.getBounds();
    const menuRight  = cx + MENU_W;
    const menuBottom = cy + MENU_H;
    const petRight   = pb.x + pb.width;
    const petBottom  = pb.y + pb.height;
    const overlapX = cx < petRight && menuRight > pb.x;
    const overlapY = cy < petBottom && menuBottom > pb.y;
    if (overlapX && overlapY) {
      // Shift menu to left of pet if it originally opened on the right
      if (cx >= pb.x) cx = pb.x - MENU_W - 8;
      else cx = petRight + 8;
      cx = Math.max(8, Math.min(cx, sw - MENU_W - 8));
    }
  }

  contextMenuWindow = new BrowserWindow({
    x: cx, y: cy,
    width: MENU_W, height: MENU_H,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "contextmenu", "contextmenu-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  contextMenuWindow.loadFile(path.join(__dirname, "contextmenu", "contextmenu.html"));
  contextMenuWindow.once("ready-to-show", () => {
    contextMenuWindow?.show();
    contextMenuWindow?.webContents.send("contextmenu:data", data);
  });
  contextMenuWindow.on("blur", () => {
    setTimeout(closeContextMenu, 100);
  });
  contextMenuWindow.on("closed", () => {
    contextMenuWindow = null;
  });
}

function showPetContextMenu(isSleeping = false) {
  if (!petWindow) return;
  const cursor = screen.getCursorScreenPoint();
  const stats = getStats();
  const currentSettings = getSettings();
  createContextMenuWindow(cursor.x, cursor.y, {
    stats,
    settings: currentSettings,
    isSleeping,
  });
}




function registerIpc() {
  handleIpc("app:resources-path", () => process.resourcesPath);
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
  // Context menu actions
  ipcMain.on("contextmenu:close", () => closeContextMenu());
  ipcMain.on("contextmenu:action", (_, action, payload) => {
    closeContextMenu();
    if (action === "feed" || action === "pet" || action === "hello" || action === "dance" ||
        action === "domain" || action === "infinity" || action === "challenge" ||
        action === "sleep" || action === "wake" || action === "birthday") {
      sendToWindow(petWindow, "menu:action", action);
      if (action === "birthday") setTimeout(() => createBirthdayWindow(), 1500);
    } else if (action === "chat") {
      createChatWindow();
    } else if (action === "settings") {
      closeChatWindow();
      createSettingsWindow();
      sendToWindow(petWindow, "menu:action", "settings");
    } else if (action === "quit") {
      isQuitting = true;
      app.quit();
    } else if (action === "toggle-runMode") {
      const cur = getSettings();
      const next = { ...cur, runMode: Boolean(payload) };
      store.set("settings", next);
      broadcastSettings();
      showBubble({ text: next.runMode ? "Run mode enabled." : "Run mode disabled.", durationMs: 2000 });
    } else if (action === "toggle-rizzMode") {
      const cur = getSettings();
      const next = { ...cur, rizzMode: Boolean(payload) };
      store.set("settings", next);
      broadcastSettings();
      if (next.rizzMode) {
        const msgs = [
          "Hey, baby girl.", "You're cute. I'm cuter.", "Wanna see my domain expansion?",
          "Strongest sorcerer. Strongest rizz too.", "Yeah, I'm that guy."
        ];
        showBubble({ text: msgs[Math.floor(Math.random() * msgs.length)], durationMs: 3000 });
      } else {
        showBubble({ text: "Rizz mode disabled.", durationMs: 2000 });
      }
    }
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
  handleIpc("pet:show-context-menu", (_, isSleeping) => {
    showPetContextMenu(isSleeping);
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
  handleIpc("birthday:get-data", () => {
    const s = getSettings();
    return {
      name: s.birthdayName || "",
      message: s.birthdayMessage || "",
    };
  });
  handleIpc("birthday:close", () => {
    if (birthdayWindow && !birthdayWindow.isDestroyed()) {
      birthdayWindow.hide();
      restorePetWindow();
      setTimeout(() => {
        if (birthdayWindow && !birthdayWindow.isDestroyed()) {
          birthdayWindow.destroy();
        }
      }, 200);
    } else {
      restorePetWindow();
    }
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
  const trayResult = createTray({
    icon: createTrayIcon(),
    onToggle: () => toggleVisibility(),
    onShow: () => toggleVisibility(true),
    onHide: () => toggleVisibility(false),
    onSummon: () => summonPet(),
    onSettings: () => createSettingsWindow(),
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
  });
  tray = trayResult.tray || trayResult;
  
  // Live stats tray tooltip — update every 60 seconds
  updateTrayTooltip();
  setInterval(updateTrayTooltip, 60000);

  // Global hotkey: Ctrl+Shift+G toggles visibility (Ctrl+Cmd+G on mac)
  try {
    const shortcut = process.platform === "darwin" ? "Command+Shift+G" : "Ctrl+Shift+G";
    globalShortcut.register(shortcut, () => toggleVisibility());
  } catch (err) {
    logError("Failed to register global shortcut", err);
  }

  // Start clipboard snooping
  startClipboardPolling();

  // Seasonal greeting on first launch (once per day)
  setTimeout(() => {
    const greet = getSeasonalGreet();
    if (greet) showBubble({ text: greet, durationMs: 5000 });
  }, 3000);

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
  globalShortcut.unregisterAll();
  clearInterval(clipboardPollTimer);
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("activate", () => {
  toggleVisibility(true);
});
