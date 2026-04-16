const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("menuAPI", {
  onData: (callback) => ipcRenderer.on("contextmenu:data", (_, data) => callback(data)),
  action: (action, payload) => ipcRenderer.send("contextmenu:action", action, payload),
  close: () => ipcRenderer.send("contextmenu:close"),
});
