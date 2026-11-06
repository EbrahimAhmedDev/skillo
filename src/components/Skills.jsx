import React, { useEffect, useMemo, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";
import FileViewer from "./FileViewer.jsx";
import HealthModal from "./HealthModal.jsx";

const SORTS = ["name", "source", "agents", "path"];

export default function Skills({ cwd, scope, setScope, refreshKey }) {
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [agentFilter, setAgentFilter] = useState("all");
  const [needle, setNeedle] = useState(""); // live filter over installed skills
  const [sortKey, setSortKey] = useState("name");
  const [confirming, setConfirming] = useState(null); // skill name pending removal
  const [selected, setSelected] = useState(new Set()); // bulk-selection mode
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null); // SKILL.md path being viewed
  const [health, setHealth] = useState(false);

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

  const visible = useMemo(() => {
    const n = needle.trim().toLowerCase();
    const filtered = (items || [])
      .filter((s) => agentFilter === "all" || (s.agents || []).includes(agentFilter))
      .filter(
        (s) =>
          !n ||
          String(s.name).toLowerCase().includes(n) ||
          String(s.source || "").toLowerCase().includes(n) ||
          String(s.path || "").toLowerCase().includes(n),
      );
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      source: (a, b) => String(a.source || "").localeCompare(String(b.source || "")),
      agents: (a, b) => (b.agents?.length || 0) - (a.agents?.length || 0),
      path: (a, b) => String(a.path || "").localeCompare(String(b.path || "")),
    };
    return filtered.sort(sorters[sortKey] || sorters.name);
  }, [items, agentFilter, needle, sortKey]);

  /* ---- bulk selection ---- */

  const toggleSelect = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedNames = visible
    .filter((s) => selected.has(s.name + s.path))
    .map((s) => s.name);

  const bulkUpdate = async () => {
    if (!selectedNames.length) return;
    const r = await api.update({
      cwd,
      skills: selectedNames,
      scope: scope === "global" ? "global" : "project",
    });
    if (!r?.ok) console.error(r?.raw);
    setSelected(new Set());
    load();
  };

  const bulkRemove = async () => {
    if (!selectedNames.length) return;
    const r = await api.remove({
      cwd,
      skills: selectedNames,
      global: scope === "global",
    });
    if (!r?.ok) console.error(r?.raw);
    setSelected(new Set());
    load();
  };

  /* ---- single-skill actions ---- */

  const removeOne = async (name) => {
    setConfirming(null);
    const r = await api.remove({ cwd, skills: [name], global: scope === "global" });
    if (!r?.ok) console.error(r?.raw);
    load();
  };

  const updateOne = async (name) => {
    await api.update({ cwd, skills: [name], scope: scope === "global" ? "global" : "project" });
    load();
  };

  const anythingSelected = selectedNames.length > 0;

  const updateAll = async () => {
    const r = await api.update({ cwd, scope: scope === "global" ? "global" : "project" });
    if (!r?.ok) console.error(r?.raw);
    load();
  };

  const allKeys = visible.map((s) => s.name + s.path);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

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

        <input
          type="search"
          className="filter-input"
          value={needle}
          placeholder={t("skills.filter")}
          onChange={(e) => setNeedle(e.target.value)}
          aria-label={t("skills.filter")}
        />

        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} aria-label={t("skills.filterAgents")}>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a === "all" ? t("skills.filterAgents") : a}
            </option>
          ))}
        </select>

        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label={t("skills.sort")}>
          {SORTS.map((k) => (
            <option key={k} value={k}>
              {t(`skills.sort_${k}`)}
            </option>
          ))}
        </select>

        <span style={{ flex: 1 }} />

        <button className="btn" onClick={() => setHealth(true)} disabled={busy}>
          {t("skills.health")}
        </button>
        {items && visible.length > 0 && (
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

      {items && visible.length > 0 && (
        <p className="hint" style={{ margin: "10px 0 0" }}>
          <label className="field-row">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(allKeys))}
            />
            {t("skills.selectAll")}
          </label>
        </p>
      )}

      {anythingSelected && (
        <div className="bulk-bar">
          <b>{t("skills.selected", { n: selectedNames.length })}</b>
          <button className="btn" onClick={bulkUpdate} disabled={busy}>
            {t("skills.updateSelected")}
          </button>
          <button className="btn-ghost-danger" onClick={bulkRemove} disabled={busy}>
            {t("skills.removeSelected")}
          </button>
          <span style={{ flex: 1 }} />
          <button className="btn-quiet" onClick={() => setSelected(new Set())}>
            {t("modal.close")}
          </button>
        </div>
      )}

      <div className="skill-list">
        {visible.map((s) => {
          const key = s.name + s.path;
          const choosable = selected.has(key);
          return (
            <article className={`skill-card ${anythingSelected ? "has-pick" : ""}`} key={key}>
              <div className="row-top">
                <div className="row-name">
                  {anythingSelected && (
                    <input
                      type="checkbox"
                      checked={choosable}
                      onChange={() => toggleSelect(key)}
                      aria-label={t("skills.pickHint")}
                      className="pick-inline"
                    />
                  )}
                  <span className="skill-name">{s.name}</span>
                </div>
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
                <button className="btn-quiet" onClick={() => setViewer(`${s.path}/SKILL.md`)}>
                  {t("skills.view")}
                </button>
                <button className="btn-quiet" onClick={() => api.openPath(s.path)}>
                  {t("skills.showPath")}
                </button>
                <button className="btn" onClick={() => updateOne(s.name)}>
                  {t("skills.update")}
                </button>
                {confirming === s.name ? (
                  <button
                    className="btn-ghost-danger"
                    onClick={() => removeOne(s.name)}
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
          );
        })}
      </div>

      {viewer && <FileViewer filePath={viewer} onClose={() => setViewer(null)} />}
      {health && <HealthModal cwd={cwd} onClose={() => setHealth(false)} />}
    </section>
  );
}
