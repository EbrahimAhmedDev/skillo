import React, { useEffect, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

/** Well-known agent ids accepted by `skills add --agent`. Auto-detect stays
 *  the default; picking checkboxes sends the exact ids to the CLI. */
const KNOWN_AGENTS = [
  "claude-code",
  "opencode",
  "cursor",
  "codex",
  "github-copilot",
  "windsurf",
  "cline",
  "gemini",
  "antigravity",
  "claude",
];

/**
 * The install dialog: previews a package (`npx skills add <pkg> -l`, installs
 * nothing), lets the user pick skills + target agents (all or exact ids) +
 * scope, then installs via the CLI.
 */
export default function InstallModal({ source, preselect, cwd, onClose, onDone }) {
  const { t } = useI18n();
  const [state, setState] = useState("loading"); // loading | ready | installing | error
  const [skills, setSkills] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [mode, setMode] = useState("auto"); // auto | pick
  const [agentIds, setAgentIds] = useState(new Set());
  const [customText, setCustomText] = useState("");
  const [copy, setCopy] = useState(false);
  const [globalMode, setGlobalMode] = useState(false);

  // Preview first — the CLI lists the package contents without installing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await api.preview({ cwd: cwd || null, pkg: source }).catch(() => null);
      if (cancelled) return;
      const list = r?.skills?.length
        ? r.skills
        : [{ name: "*", description: "Every skill in this package" }];
      setSkills(list);
      setPicked(preselect ? new Set([preselect]) : new Set(list.length === 1 ? [list[0].name] : []));
      setState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [source, preselect, cwd]);

  const toggle = (name) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAgent = (id) => {
    setAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    setState("installing");
    let spec = [...picked];
    if (spec.length === 1 && spec[0] === "*") spec = []; // the CLI treats '*' as "all"
    if (!spec.length && preselect) spec = [preselect];
    const manual = [...agentIds, ...customText.split(/[,\s]+/).filter(Boolean)];
    const r = await api.add({
      cwd,
      pkg: source,
      skills: spec,
      agents: mode === "auto" ? [] : manual,
      global: globalMode,
      copy,
    });
    if (r?.ok) {
      onDone?.();
      onClose();
    } else {
      setState("error");
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal" onKeyDown={(e) => e.key === "Escape" && onClose()}>
        <h3>
          {t("modal.skillsIn")} <span className="mono">{source}</span>
        </h3>
        <p className="hint">
          {state === "installing" ? t("modal.starting") : t("search.chooseFirst")}
        </p>

        {state === "loading" && <p className="mono hint">npx skills add {source} -l …</p>}
        {state === "error" && (
          <p className="hint" style={{ color: "var(--bad)" }}>{t("toast.failed")}</p>
        )}

        {(state === "ready" || state === "installing") && (
          <>
            <div className="pick-list">
              {skills.map((s) => (
                <label className="pick" key={s.name}>
                  <input type="checkbox" checked={picked.has(s.name)} onChange={() => toggle(s.name)} />
                  <span>
                    <span className="pick-name">{s.name}</span>
                    {s.description && <p className="pick-desc">{s.description}</p>}
                  </span>
                </label>
              ))}
            </div>

            <span className="field-label">{t("modal.agents")}</span>
            <div className="agent-mode">
              <label className="field-row">
                <input
                  type="radio"
                  checked={mode === "auto"}
                  onChange={() => setMode("auto")}
                />
                {t("search.agentsAuto")}
              </label>
              <label className="field-row">
                <input
                  type="radio"
                  checked={mode === "pick"}
                  onChange={() => setMode("pick")}
                />
                {t("search.agentsPick")}
              </label>
            </div>

            {mode === "pick" && (
              <>
                <div className="agent-pick-list">
                  {KNOWN_AGENTS.map((id) => (
                    <label className={`agent-pick ${agentIds.has(id) ? "on" : ""}`} key={id}>
                      <input type="checkbox" checked={agentIds.has(id)} onChange={() => toggleAgent(id)} />
                      <span className="mono">{id}</span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  value={customText}
                  placeholder={t("search.agentsCustom")}
                  onChange={(e) => setCustomText(e.target.value)}
                />
              </>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
              <label className="field-row">
                <input type="checkbox" checked={globalMode} onChange={(e) => setGlobalMode(e.target.checked)} />
                {t("search.globalMode")}
              </label>
              <label className="field-row">
                <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} />
                {t("search.copyMode")}
              </label>
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn-quiet" onClick={onClose}>
            {t("modal.close")}
          </button>
          <button
            className="btn-primary"
            disabled={picked.size === 0 || state !== "ready" || (mode === "pick" && !agentIds.size && !customText.trim())}
            onClick={confirm}
          >
            {t("modal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
