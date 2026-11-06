const { contextBridge, ipcRenderer } = require("electron");

/**
 * Every bridge call takes an explicit `on` map so the renderer can stream
 * CLI output into the live bar while a command runs.
 */
contextBridge.exposeInMainWorld("skillo", {
  version: (cwd) => ipcRenderer.invoke("skills:version", cwd),
  list: (opts) => ipcRenderer.invoke("skills:list", opts),
  preview: (opts) => ipcRenderer.invoke("skills:preview", opts),
  add: (opts) => ipcRenderer.invoke("skills:add", opts),
  remove: (opts) => ipcRenderer.invoke("skills:remove", opts),
  update: (opts) => ipcRenderer.invoke("skills:update", opts),
  installLock: (opts) => ipcRenderer.invoke("skills:installLock", opts),
  sync: (opts) => ipcRenderer.invoke("skills:sync", opts),
  init: (opts) => ipcRenderer.invoke("skills:init", opts),
  patchDescription: (opts) => ipcRenderer.invoke("skills:patchDescription", opts),
  find: (opts) => ipcRenderer.invoke("skills:find", opts),
  webSearch: (opts) => ipcRenderer.invoke("web:search", opts),

  pickFolder: () => ipcRenderer.invoke("app:pickFolder"),
  defaultCwd: () => ipcRenderer.invoke("app:defaultCwd"),
  openPath: (p) => ipcRenderer.invoke("app:openPath", p),

  onRunStarted: (cb) => {
    const fn = (_e, p) => cb(p);
    ipcRenderer.on("run:started", fn);
    return () => ipcRenderer.removeListener("run:started", fn);
  },
  onRunStream: (cb) => {
    const fn = (_e, p) => cb(p);
    ipcRenderer.on("run:stream", fn);
    return () => ipcRenderer.removeListener("run:stream", fn);
  },
  onRunDone: (cb) => {
    const fn = (_e, p) => cb(p);
    ipcRenderer.on("run:done", fn);
    return () => ipcRenderer.removeListener("run:done", fn);
  },

  history: (opts) => ipcRenderer.invoke("history:list", opts),
  readSkillFile: (filePath) => ipcRenderer.invoke("app:readSkillFile", filePath),
  saveJson: (opts) => ipcRenderer.invoke("app:saveJson", opts),
  openJson: () => ipcRenderer.invoke("app:openJson"),
  doctor: (opts) => ipcRenderer.invoke("skills:doctor", opts),
});
