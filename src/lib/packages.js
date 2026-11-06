/** Shared helpers for the Find & add screen. */

/** Normalise user input (URL / owner/repo / skills.sh link) to an installable spec. */
export function normalizePkg(input) {
  let s = input.trim().replace(/^https?:\/\/(www\.)?/, "");
  s = s.replace(/^github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  s = s.replace(/^skills\.sh\//, "");
  return s || null;
}

/** 1234 → "1.2K", 1234567 → "1.2M", unknown → "—". */
export function fmtInstalls(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** True when the text is clearly a repo reference rather than a search keyword. */
export const looksLikeRepo = (s) =>
  /^https?:\/\//.test(s) || /^github\.com\//.test(s) || /^[\w.-]+\/[\w.-]+(@[\w:-]*)?$/.test(s);
