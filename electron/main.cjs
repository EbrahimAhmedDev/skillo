/* Skillo — a visual desktop manager for the skills.sh CLI.
 *
 * Architecture (see each module for details):
 *   cli-runner.cjs  spawns the real `npx skills …` and streams its output
 *   ipc.cjs         every renderer operation → one CLI invocation
 *   parsers.cjs     shared CLI text parsers (also unit-tested)
 *   net.cjs         skills.sh API + dev-server polling
 *   smoke.cjs       ESK_SMOKE=1 headless end-to-end harness
 */

const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { createRunner } = require("./cli-runner.cjs");
const { registerIpc } = require("./ipc.cjs");
const { runSmoke } = require("./smoke.cjs");
const { waitUntil } = require("./net.cjs");

const DEV_URL = "http://localhost:5173/";

let win = null;

const runner = createRunner({
  onEvent: (channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  },
});
const { handlers } = registerIpc({ runSkills: runner.runSkills, getWindow: () => win });

if (process.env.ESK_SMOKE) {
  // must be called before the app is ready
  app.disableHardwareAcceleration();
}

app.whenReady().then(() => {
  if (process.env.ESK_SMOKE) {
    runSmoke(handlers, (ok) => app.exit(ok ? 0 : 1));
    return;
  }
  win = createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) win = createWindow();
  });
});

function createWindow() {
  const newWin = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: "#101713",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ESK_DEV) {
    waitUntil(DEV_URL).then(() => newWin.loadURL(DEV_URL));
  } else {
    newWin.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // external links open in the user's browser, never inside the app
  newWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return newWin;
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => runner.killAll());
