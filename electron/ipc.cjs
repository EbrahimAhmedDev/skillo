/* The IPC surface: one `handle()` per channel. Every skills operation maps
 * straight onto the real CLI invocation shown in the comment above it, so
 * the UI can never drift away from what skills.sh documents.
 *
 * Handlers are also collected in a Map so the headless smoke harness
 * (ESK_SMOKE=1) can exercise the exact same code paths without a window.
 */

const { ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { parseSkillListing, parseFindOutput, tryJSON } = require("./parsers.cjs");
const { searchSkillsSh } = require("./net.cjs");
const { readHistory } = require("./history.cjs");

const VERSION_RE = /^v?\d+\.\d+\.\d+/;
const HOMEDIR = os.homedir();

/** Register all channels; returns the handlers map (for the smoke harness). */
function registerIpc({ runSkills, getWindow }) {
  const handlers = new Map();
  const handle = (channel, fn) => {
    handlers.set(channel, fn);
    ipcMain.handle(channel, fn);
  };

  handle("skills:version", async (_e, cwd) => {
    const r = await runSkills(["--version"], { cwd, label: "version", timeoutMs: 60_000 });
    return r.stdout.trim();
  });

  // npx skills list --json [-g]
  handle("skills:list", async (_e, { cwd, scope = "project" }) => {
    const args = ["list", "--json"];
    if (scope === "global") args.push("-g");
    const r = await runSkills(args, { cwd: scope === "global" ? HOMEDIR : cwd, label: "list", timeoutMs: 60_000 });
    if (r.code !== 0) return { ok: false, error: r.stderr || r.stdout || `exit ${r.code}` };
    let items = [];
    try {
      const parsed = JSON.parse(r.stdout.trim());
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      // the CLI sometimes prints a fatal line before the JSON — take the last […]
      const m = r.stdout.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          items = JSON.parse(m[0]);
        } catch {}
      }
    }
    return { ok: true, items, raw: r.stdout };
  });

  // npx skills add <pkg> -l  → preview without installing anything
  handle("skills:preview", async (_e, { cwd, pkg }) => {
    const r = await runSkills(["add", pkg, "-l"], { cwd: cwd || HOMEDIR, label: "preview", timeoutMs: 120_000 });
    return { ok: r.code === 0, ...parseSkillListing(r.stdout), raw: r.stdout, code: r.code };
  });

  // npx skills add <pkg> [-s …] [-a …] [-g] [--copy] --json -y
  handle("skills:add", async (_e, { cwd, pkg, skills, agents, global, copy }) => {
    const args = ["add", pkg, "--json", "-y"];
    const useAll = !skills || skills.length === 0 || skills[0] === "*";
    args.push("-s", useAll ? "*" : skills.join(" "));
    if (agents && agents.length) args.push("-a", agents.join(" "));
    if (global) args.push("-g");
    if (copy) args.push("--copy");
    const r = await runSkills(args, { cwd: global ? HOMEDIR : cwd, label: "add" });
    return { ok: r.code === 0, result: tryJSON(r.stdout), raw: r.stdout + r.stderr, code: r.code };
  });

  // npx skills remove <names> [-a …] [-g] -y
  handle("skills:remove", async (_e, { cwd, skills, global, agents }) => {
    if (!skills || !skills.length) return { ok: false, error: "no skills selected" };
    const args = ["remove", "--skill", skills.join(" "), "-y"];
    if (global) args.push("-g");
    if (agents && agents.length) args.push("-a", agents.join(" "));
    const r = await runSkills(args, { cwd: global ? HOMEDIR : cwd, label: "remove" });
    return { ok: r.code === 0, raw: r.stdout + r.stderr, code: r.code };
  });

  // npx skills update [names…] [-g | -p] -y
  handle("skills:update", async (_e, { cwd, skills, scope = "project" }) => {
    const args = ["update", "-y"];
    if (scope === "global") args.push("-g");
    if (scope === "project") args.push("-p");
    if (skills && skills.length) args.push(...skills);
    const r = await runSkills(args, { cwd: scope === "global" ? HOMEDIR : cwd, label: "update" });
    return { ok: r.code === 0, result: tryJSON(r.stdout), raw: r.stdout + r.stderr, code: r.code };
  });

  // npx skills experimental_install [--dry-run | --no-frozen-lockfile] — restore from skills-lock.json
  handle("skills:installLock", async (_e, { cwd, dryRun }) => {
    const args = ["experimental_install", dryRun ? "--dry-run" : "--no-frozen-lockfile"];
    const r = await runSkills(args, { cwd, label: "install-lock" });
    return { ok: r.code === 0, raw: r.stdout + r.stderr, code: r.code };
  });

  // npx skills experimental_sync [--dry-run] — link node_modules skills into agent dirs
  handle("skills:sync", async (_e, { cwd, dryRun }) => {
    const args = ["experimental_sync", "-y"];
    if (dryRun) args.push("--dry-run");
    const r = await runSkills(args, { cwd, label: "sync" });
    return { ok: r.code === 0, raw: r.stdout + r.stderr, code: r.code };
  });

  // npx skills init <name> — scaffold a local skill
  handle("skills:init", async (_e, { cwd, name }) => {
    const r = await runSkills(["init", name || "new-skill"], { cwd, label: "init", timeoutMs: 60_000 });
    return { ok: r.code === 0, raw: r.stdout + r.stderr, code: r.code };
  });

  // `skills init` creates a template SKILL.md — fill in the description the
  // user typed in the form (exact line replace in the frontmatter).
  handle("skills:patchDescription", async (_e, { dir, description }) => {
    try {
      const file = path.join(dir, "SKILL.md");
      const text = fs.readFileSync(file, "utf8");
      const cleaned = String(description || "").replace(/^[\s#]+/, "").trim();
      const patched = text.replace(/^description:\s*.*$/m, `description: ${cleaned}`);
      fs.writeFileSync(file, patched);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // npx skills find <query> — fallback search when skills.sh is unreachable
  handle("skills:find", async (_e, { query }) => {
    const args = ["find", String(query || "").trim()].filter(Boolean);
    const r = await runSkills(args, { cwd: HOMEDIR, label: "find", timeoutMs: 90_000 });
    if (r.code !== 0) return { ok: false, items: [], error: r.stderr || r.stdout };
    return { ok: true, items: parseFindOutput(r.stdout) };
  });

  // skills.sh search API, proxied through main to dodge CORS
  handle("web:search", async (_e, query) => {
    const q = String(query || "").trim();
    if (q.length < 2) return { ok: true, items: [] };
    try {
      return { ok: true, items: await searchSkillsSh(q) };
    } catch (err) {
      return { ok: false, items: [], error: String(err) };
    }
  });

  handle("app:pickFolder", async () => {
    const res = await dialog.showOpenDialog(getWindow(), {
      title: "Choose project folder",
      properties: ["openDirectory"],
      defaultPath: HOMEDIR,
    });
    if (res.canceled || !res.filePaths.length) return null;
    return res.filePaths[0];
  });

  handle("app:openPath", async (_e, p) => {
    shell.openPath(p);
    return true;
  });

  handle("app:defaultCwd", () => process.cwd() || HOMEDIR);

  /* ---- history, doctor, file viewer, backup -------------------------- */

  handle("history:list", async () => ({ ok: true, items: readHistory(300) }));

  // Read a file (currently only SKILL.md files) as plain text.
  handle("app:readSkillFile", async (_e, filePath) => {
    try {
      const p = String(filePath || "");
      if (path.basename(p) !== "SKILL.md") return { ok: false, error: "not a SKILL.md file" };
      const content = await fs.promises.readFile(p, "utf8");
      return { ok: true, content };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // Export: ask where to save, write pretty JSON.
  handle("app:saveJson", async (_e, { defaultName, data }) => {
    const res = await dialog.showSaveDialog(getWindow(), {
      title: "Export skills",
      defaultPath: path.join(HOMEDIR, "Downloads", defaultName || "skillo-skills.json"),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (res.canceled || !res.filePath) return null;
    await fs.promises.writeFile(res.filePath, JSON.stringify(data, null, 2));
    return res.filePath;
  });

  // Import: pick a JSON file exported from Skillo and parse it.
  handle("app:openJson", async () => {
    const res = await dialog.showOpenDialog(getWindow(), {
      title: "Import skills",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (res.canceled || !res.filePaths.length) return null;
    try {
      return { ok: true, data: JSON.parse(await fs.promises.readFile(res.filePaths[0], "utf8")) };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // Health check: every installed skill's folder + SKILL.md still exist?
  handle("skills:doctor", async (_e, { cwd }) => {
    const issues = [];
    const scopes = [
      { scope: "project", cwd },
      { scope: "global", cwd: HOMEDIR },
    ];
    for (const { scope, dir } of scopes) {
      const r = await handlers.get("skills:list")(null, { cwd: dir, scope });
      if (!r.ok) {
        issues.push({ scope, kind: "list-failed", detail: String(r.error || "") });
        continue;
      }
      for (const s of r.items) {
        if (!fs.existsSync(s.path)) {
          issues.push({ name: s.name, path: s.path, scope, kind: "missing-folder" });
        } else if (!fs.existsSync(path.join(s.path, "SKILL.md"))) {
          issues.push({ name: s.name, path: s.path, scope, kind: "missing-skill-md" });
        }
      }
    }
    const lockfile = fs.existsSync(path.join(cwd || HOMEDIR, "skills-lock.json"));
    return { ok: issues.length === 0, issues, lockfile };
  });

  return { handlers, VERSION_RE };
}

module.exports = { registerIpc };
