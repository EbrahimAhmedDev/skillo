/* Headless smoke test: ESK_SMOKE=1 runs the real handlers end-to-end
 * (spawn → parse) and prints one JSON line, then exits. No window needed.
 *
 * Usage: ESK_SMOKE=1 npm run smoke
 */

const os = require("node:os");
const fs = require("node:fs");
const VERSION_RE = /^v?\d+\.\d+\.\d+/;

async function runSmoke(handlers, exit) {
  const cwd = process.env.ESK_SMOKE_CWD || "/tmp/opencode/smoke-project";
  const call = (channel, payload) => handlers.get(channel)(null, payload);
  const out = {};

  try {
    out.version = await call("skills:version", cwd);
    out.versionOk = VERSION_RE.test(out.version);

    out.globalList = await call("skills:list", { cwd, scope: "global" });
    out.globalCount = out.globalList.items.length;
    out.listShapeOk = out.globalList.items.every((s) => "name" in s && "agents" in s && "path" in s);

    out.preview = await call("skills:preview", { cwd: os.tmpdir(), pkg: "mattpocock/skills" });
    out.previewCount = out.preview.skills.length;

    out.search = await call("web:search", "react");
    out.searchCount = out.search.items.length;

    out.ok =
      out.versionOk &&
      out.globalCount > 0 &&
      out.previewCount >= 10 &&
      out.searchCount > 0 &&
      out.listShapeOk;
  } catch (err) {
    out.ok = false;
    out.error = String(err);
  }

  fs.writeSync(2, `SMOKE:${JSON.stringify(out)}\n`);
  exit(out.ok);
}

module.exports = { runSmoke };
