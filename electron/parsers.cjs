/* Output parsers shared between main.cjs and tests.
 * The CLI prints human tables when --json is unavailable (add -l, find), so
 * these turn ANSI-heavy plain text into data. */

/** Remove ANSI escapes, spinner cursor moves, and OSC sequences. */
function stripANSI(s) {
  return s
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "")
    .replace(/\x1b[()][B0]/g, "");
}

/**
 * Parse `add <pkg> -l` text into [{ name, description }].
 * With NO_COLOR the "Available Skills" section looks like:
 *   ◇  Available Skills
 *   Group Name
 *   │
 *   │    skill-name
 *   │
 *   │      Description text spanning lines.
 */
function parseSkillListing(out) {
  const text = stripANSI(out);
  const marker = text.indexOf("Available Skills");
  if (marker === -1) {
    const count = text.match(/Found (\d+) skills/);
    return { skills: [], found: count ? Number(count[1]) : 0 };
  }
  const skills = [];
  let cur = null;
  for (const line of text.slice(marker).split("\n").slice(1)) {
    // name entry: │ + exactly 4 spaces + one token
    const name = line.match(/^│\s{4}([a-zA-Z0-9][a-zA-Z0-9:_.@-]*)\s*$/);
    if (name) {
      cur = { name: name[1], description: "" };
      skills.push(cur);
      continue;
    }
    // description entry: │ + 6 or more spaces + text
    const desc = line.match(/^│\s{6,}(\S.*?)\s*$/);
    if (desc && cur) {
      cur.description = cur.description ? `${cur.description} ${desc[1]}` : desc[1];
    }
  }
  return { skills, found: skills.length };
}

/** Parse `find <query>` fallback output into skill search results. */
function parseFindOutput(out) {
  const text = stripANSI(out);
  const items = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([^\s]+@[^\s]+)\s+([\d.,]+[KM]?)\s*installs?/);
    if (m) {
      const [source, skillId] = m[1].split("@");
      items.push({ id: m[1], name: skillId, skillId, source, installsText: m[2] });
    }
  }
  return items;
}

function tryJSON(s) {
  try { return JSON.parse(String(s || "").trim()); } catch { return null; }
}

module.exports = { stripANSI, parseSkillListing, parseFindOutput, tryJSON };
