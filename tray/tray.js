const { Menu, Tray } = require("electron");

function createTray({ icon, onToggle, onShow, onHide, onSettings, onQuit, onSummon }) {
  const tray = new Tray(icon);

  const buildMenu = () =>
    Menu.buildFromTemplate([
      { label: "Show", click: onShow },
      { label: "Hide", click: onHide },
      { label: "Bring Gojo Here", click: onSummon },
      { type: "separator" },
      { label: "Settings", click: onSettings },
      { type: "separator" },
      { label: "Quit", click: onQuit },
    ]);

  tray.setToolTip("Gojo Satoru Pet");
  tray.setContextMenu(buildMenu());
  tray.on("click", onToggle);
  tray.on("double-click", onSummon);

  return { tray, setToolTip: (t) => tray.setToolTip(t) };
}

module.exports = { createTray };
