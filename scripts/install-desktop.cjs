#!/usr/bin/env node
/* Writes a per-user desktop launcher for Skillo (Linux):
 *   ~/.local/bin/skillo       wrapper that starts the built app
 *   ~/.local/share/applications/skillo.desktop
 *   ~/.local/share/icons/skillo.png
 * Usage: npm run desktop
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
const exec = path.join(appDir, "node_modules", ".bin", "electron");

const localBin = path.join(os.homedir(), ".local", "bin");
const appsDir = path.join(os.homedir(), ".local", "share", "applications");
const iconSrc = path.join(appDir, "assets", "icons", "512x512.png");
const iconDst = path.join(os.homedir(), ".local", "share", "icons", "skillo.png");

for (const dir of [localBin, appsDir, path.dirname(iconDst)]) {
  fs.mkdirSync(dir, { recursive: true });
}

const wrapper = path.join(localBin, "skillo");
fs.writeFileSync(
  wrapper,
  `#!/usr/bin/env bash\nexec "${exec}" "${appDir}" "$@"\n`,
  { mode: 0o755 },
);
fs.copyFileSync(iconSrc, iconDst);

const desktop = path.join(appsDir, "skillo.desktop");
fs.writeFileSync(
  desktop,
  [
    "[Desktop Entry]",
    "Type=Application",
    "Version=1.0",
    "Name=Skillo",
    "Comment=Skills manager for your AI agents (npx skills)",
    `Exec=${wrapper}`,
    `Icon=${iconDst}`,
    "Categories=Development;Utility;",
    "Terminal=false",
    "StartupWMClass=Skillo",
    "",
  ].join("\n"),
);

console.log(`desktop launcher written:\n  ${wrapper}\n  ${desktop}\n  ${iconDst}`);
