/* The CLI engine.
 *
 * Everything Skillo does runs through the real `npx skills …` CLI — this
 * module is the single place that spawns it. A non-interactive environment
 * (CI=1, NO_COLOR=1, TERM=dumb) keeps output plain and parseable, and every
 * chunk is streamed to the renderer so the UI shows exactly what the CLI
 * prints, live.
 */

const { spawn } = require("child_process");
const os = require("node:os");
const fs = require("node:fs");

const DEFAULT_TIMEOUT = 10 * 60_000;

/** Create a runner bound to an event channel (usually `webContents.send`). */
function createRunner({ onEvent = () => {} } = {}) {
  let jobSeq = 0;
  const jobs = new Map(); // id -> { proc }

  function runSkills(args, { cwd, label, timeoutMs = DEFAULT_TIMEOUT } = {}) {
    const id = `job_${++jobSeq}_${Date.now()}`;
    const workdir = cwd && cwd.trim() && fs.existsSync(cwd) ? cwd : os.homedir();

    const bin = process.platform === "win32" ? "npx.cmd" : "npx";
    const proc = spawn(bin, ["skills", ...args], {
      cwd: workdir,
      env: { ...process.env, CI: "1", NO_COLOR: "1", TERM: "dumb" },
    });

    jobs.set(id, { proc });
    send("run:started", { id, label, cmd: `npx skills ${args.join(" ")}` });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      send("run:stream", { id, stream: "stdout", text });
    });
    proc.stderr.on("data", (chunk) => {
      const text = String(chunk);
      stderr += text;
      send("run:stream", { id, stream: "stderr", text });
    });

    return new Promise((resolve) => {
      proc.on("error", (err) => {
        clearTimeout(timer);
        jobs.delete(id);
        send("run:done", { id, code: -1, error: String(err) });
        resolve({ id, code: -1, stdout, stderr, error: String(err) });
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        jobs.delete(id);
        send(`run:done`, { id, code: code ?? -1 });
        resolve({ id, code: code ?? -1, stdout, stderr });
      });
    });
  }

  /** Kill every in-flight job (called on app quit). */
  function killAll() {
    for (const { proc } of jobs.values()) {
      try {
        proc.kill("SIGKILL");
      } catch {}
    }
  }

  function send(channel, payload) {
    onEvent(channel, payload);
  }

  return { runSkills, killAll };
}

module.exports = { createRunner, DEFAULT_TIMEOUT };
