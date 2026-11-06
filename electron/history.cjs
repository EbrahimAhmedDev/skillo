/* Operation history: every mutating CLI run (add/remove/update/init/sync/
 * lockfile) is appended to <userData>/skillo-history.jsonl as one JSON line,
 * so the UI can show "what happened on this machine and when".
 */

const fs = require("node:fs");
const path = require("node:path");

let file = null;

/** Point the log at <userData> (called once, at startup). */
function initHistory(userDataDir) {
  file = path.join(userDataDir, "skillo-history.jsonl");
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  } catch {}
}

/** Labels that change actual state (not view-only like list/find/preview). */
const MUTATING = new Set(["add", "remove", "update", "init", "sync", "install-lock"]);

const isMutating = (label) => MUTATING.has(label);

/** entry = { label, cmd, code, error? } */
function appendHistory(entry) {
  if (!file) return;
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  try {
    fs.appendFileSync(file, line + "\n");
  } catch {}
}

/** Newest first, capped. */
function readHistory(limit = 300) {
  try {
    const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
    const rows = lines.slice(-limit).flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
    return rows.reverse();
  } catch {
    return [];
  }
}

module.exports = { initHistory, appendHistory, readHistory, isMutating };
