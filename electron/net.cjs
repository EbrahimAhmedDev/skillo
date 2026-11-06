/* Small networking helpers used by the main process (no fetch dependency on
 * old runtimes, one place for redirects and timeouts). */

const http = require("node:http");
const https = require("node:https");

/** HTTP(S) GET → body text, following redirects. */
async function fetchText(url, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const mod = new URL(url).protocol === "https:" ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.headers.location) {
        fetchText(new URL(res.headers.location, url).href, timeoutMs).then(resolve, reject);
        res.resume();
        return;
      }
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`timeout fetching ${url}`)));
  });
}

/**
 * skills.sh search API. Returns [{ id, name, skillId, source, installs }].
 * The API needs a query of at least 2 characters.
 */
async function searchSkillsSh(query) {
  // 6s cap: a slower response is useless for live-as-you-type search
  const body = await fetchText(`https://skills.sh/api/search?q=${encodeURIComponent(query)}`, 6_000);
  const data = JSON.parse(body);
  return (data.skills || []).map((s) => ({
    id: s.id,
    name: s.name,
    skillId: s.skillId,
    source: s.source,
    installs: s.installs,
  }));
}

/** Poll a dev-server URL until something answers (used in `npm run dev`). */
function waitUntil(url, tries = 60) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      const req = http.get(url, () => {
        req.destroy();
        resolve();
      });
      req.on("error", () => {
        if (n <= 0) return resolve();
        setTimeout(() => attempt(n - 1), 400);
      });
    };
    attempt(tries);
  });
}

module.exports = { fetchText, searchSkillsSh, waitUntil };
