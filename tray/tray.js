const { Menu, Tray } = require("electron");

function createTray({ icon, onToggle, onShow, onHide, onSettings, onQuit }) {
  const tray = new Tray(icon);

  const buildMenu = () =>
    Menu.buildFromTemplate([
      { label: "Show", click: onShow },
      { label: "Hide", click: onHide },
      { type: "separator" },
      { label: "Settings", click: onSettings },
      { type: "separator" },
      { label: "Quit", click: onQuit },
    ]);

  tray.setToolTip("Gojo Satoru Pet");
  tray.setContextMenu(buildMenu());
  tray.on("click", onToggle);

  return tray;
}

module.exports = { createTray };
