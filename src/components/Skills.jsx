import React, { useEffect, useMemo, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

export default function Skills({ cwd, scope, setScope, refreshKey }) {
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [agentFilter, setAgentFilter] = useState("all");
  const [confirming, setConfirming] = useState(null); // skill name pending removal
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true);
    api
      .list({ cwd, scope })
      .then((r) => {
        if (r?.ok === false) {
          setError(r.error);
          setItems([]);
        } else {
          setItems(r.items || []);
          setError(null);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    load();
  }, [cwd, scope, refreshKey]);

  const agents = useMemo(() => {
    const set = new Set();
    (items || []).forEach((s) => (s.agents || []).forEach((a) => set.add(a)));
    return ["all", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const visible = (items || []).filter(
    (s) => agentFilter === "all" || (s.agents || []).includes(agentFilter),
  );

  const remove = async (name) => {
    setConfirming(null);
    const r = await api.remove({ cwd, skills: [name], global: scope === "global" });
    if (!r?.ok) console.error(r?.raw);
    load();
  };

  const updateAll = async () => {
    const r = await api.update({ cwd, scope: scope === "global" ? "global" : "project" });
    if (!r?.ok) console.error(r?.raw);
    load();
  };

  const updateOne = async (name) => {
    await api.update({ cwd, skills: [name], scope: scope === "global" ? "global" : "project" });
    load();
  };

  return (
    <section>
      <h2 className="view-title">
        {t("skills.title")}
        <span className="count">{visible.length}</span>
      </h2>
      <p className="view-sub">{scope === "global" ? t("scope.global") : t("scope.project")}</p>

      <div className="toolbar">
        <div className="scope-tabs" role="tablist">
          {["project", "global"].map((s) => (
            <button key={s} aria-pressed={scope === s} onClick={() => setScope(s)}>
              {t(`scope.${s}`)}
            </button>
          ))}
        </div>

        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          aria-label={t("skills.filterAgents")}
        >
          {agents.map((a) => (
            <option key={a} value={a}>
              {a === "all" ? t("skills.filterAgents") : a}
            </option>
          ))}
        </select>

        <span style={{ flex: 1 }} />

        {visible.length > 0 && (
          <button className="btn" onClick={updateAll} disabled={busy}>
            {t("skills.updateAll")}
          </button>
        )}
        <button className="btn" onClick={load} disabled={busy}>
          {t("skills.refresh")}
        </button>
      </div>

      {error && <p className="hint" style={{ color: "var(--bad)" }}>{error}</p>}

      {items && visible.length === 0 && !error && (
        <div className="empty">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 9v12" />
          </svg>
          <h4>{t("skills.empty")}</h4>
          <p className="hint">{t("skills.emptyHint")}</p>
        </div>
      )}

      <div className="skill-list">
        {visible.map((s) => (
          <article className="skill-card" key={s.name + s.path}>
            <div className="row-top">
              <span className="skill-name">{s.name}</span>
              <span className="badge">{s.status || t("skills.status")}</span>
            </div>

            {s.agents?.length > 0 && (
              <div className="agent-chips">
                {s.agents.map((a) => (
                  <span className="agent-chip" key={a}>
                    {a}
                  </span>
                ))}
              </div>
            )}

            <div className="skill-meta" title={s.sourceUrl || s.source || ""}>
              {t("skills.source")}: {s.source || "—"}
            </div>

            <div className="skill-meta">
              {t("skills.installedIn")}: <span className="path">{s.path}</span>
            </div>

            <div className="skill-actions">
              <button className="btn-quiet" onClick={() => api.openPath(s.path)}>
                {t("skills.showPath")}
              </button>
              <button className="btn" onClick={() => updateOne(s.name)}>
                {t("skills.update")}
              </button>
              {confirming === s.name ? (
                <button
                  className="btn-ghost-danger"
                  onClick={() => remove(s.name)}
                  onBlur={() => setConfirming(null)}
                >
                  {t("skills.remove")} ✓ ?
                </button>
              ) : (
                <button className="btn-ghost-danger" onClick={() => setConfirming(s.name)}>
                  {t("skills.remove")}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
