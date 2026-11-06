/** Thin wrapper so views don't care about the preload bridge (and the app
 *  still renders for design review in a plain browser — bridge calls resolve
 *  with safe empty results instead of crashing). */

const UNAVAILABLE = "bridge unavailable";

const fallback = {
  list: { ok: true, items: [] },
  preview: { ok: false, skills: [] },
  find: { ok: true, items: [] },
  webSearch: { ok: true, items: [] },
};

function guarded(name, fallbackValue) {
  return (...args) => {
    const fn = window.skillo?.[name];
    if (fn) return fn(...args);
    if (fallbackValue !== undefined) return Promise.resolve(fallbackValue);
    return Promise.reject(new Error(`${name}: ${UNAVAILABLE}`));
  };
}

export const api = {
  version: guarded("version", ""),
  list: guarded("list", fallback.list),
  preview: guarded("preview", fallback.preview),
  add: guarded("add", { ok: false, error: UNAVAILABLE, raw: UNAVAILABLE }),
  remove: guarded("remove", { ok: false, error: UNAVAILABLE, raw: UNAVAILABLE }),
  update: guarded("update", { ok: false, error: UNAVAILABLE, raw: UNAVAILABLE }),
  installLock: guarded("installLock", { ok: false, error: UNAVAILABLE, raw: UNAVAILABLE }),
  sync: guarded("sync", { ok: false, error: UNAVAILABLE, raw: UNAVAILABLE }),
  init: guarded("init", { ok: false, error: UNAVAILABLE, raw: UNAVAILABLE }),
  patchDescription: guarded("patchDescription", { ok: false, error: UNAVAILABLE }),
  find: guarded("find", fallback.find),
  webSearch: guarded("webSearch", fallback.webSearch),
  pickFolder: guarded("pickFolder", null),
  defaultCwd: guarded("defaultCwd", ""),
  openPath: guarded("openPath", true),
  onRunStarted: (...a) => window.skillo?.onRunStarted(...a),
  onRunStream: (...a) => window.skillo?.onRunStream(...a),
  onRunDone: (...a) => window.skillo?.onRunDone(...a),
};

export default api;
