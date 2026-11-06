import React, { useEffect, useMemo, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

/** Backup card body: export the current lists as JSON, or import a file and
 *  reinstall the packages it references (grouped by source). */
function BackupCard({ cwd }) {
  const { t } = useI18n();
  const [groups, setGroups] = useState(null); // [{ source, skills: [name…] }]
  const [busySource, setBusySource] = useState(null);
  const [note, setNote] = useState(null); // { kind, text }

  const exportAll = async () => {
    setNote(null);
    const [project, global] = await Promise.all([
      api.list({ cwd, scope: "project" }).catch(() => null),
      api.list({ cwd, scope: "global" }).catch(() => null),
    ]);
    const data = {
      skillo: 1,
      exportedAt: new Date().toISOString(),
      project: project?.items || [],
      global: global?.items || [],
    };
    if (!data.project.length && !data.global.length) {
      setNote({ kind: "error", text: t("backup.empty") });
      return;
    }
    const saved = await api.saveJson({ defaultName: "skillo-skills.json", data });
    setNote(saved ? { kind: "ok", text: t("backup.exportedTo") } : null);
    if (saved) console.info(saved);
  };

  const pickFile = async () => {
    setNote(null);
    setGroups(null);
    const r = await api.openJson();
    if (!r) return;
    if (r.ok === false) {
      setNote({ kind: "error", text: String(r.error) });
      return;
    }
    // build install groups: one per source, all skills found under it
    const rows = [...(r.data?.project || []), ...(r.data?.global || [])];
    const map = new Map();
    for (const row of rows) {
      const source = row.source || row.sourceUrl;
      if (!source) continue;
      if (!map.has(source)) map.set(source, new Set());
      map.get(source).add(row.name);
    }
    const g = [...map.entries()].map(([source, names]) => ({ source, skills: [...names] }));
    if (!g.length) {
      setNote({ kind: "error", text: t("backup.unusable") });
      return;
    }
    setGroups(g);
    setNote({ kind: "info", text: t("backup.loaded", { n: g.length }) });
  };

  const installGroup = async (g) => {
    setBusySource(g.source);
    const r = await api.add({ cwd, pkg: g.source, skills: g.skills, agents: [] });
    setBusySource(null);
    setGroups((prev) => prev.filter((x) => x.source !== g.source));
    setNote(
      r?.ok
        ? { kind: "ok", text: t("backup.installedOk", { n: g.skills.length }) }
        : { kind: "error", text: t("backup.installFailed") },
    );
  };

  return (
    <div className="set-card">
      <h3>{t("backup.title")}</h3>
      <p className="hint">{t("backup.hint")}</p>
      <div className="dir-row">
        <button className="btn" onClick={exportAll}>
          {t("backup.export")}
        </button>
        <button className="btn" onClick={pickFile}>
          {t("backup.import")}
        </button>
      </div>

      {note && (
        <p className="hint" style={{ color: note.kind === "error" ? "var(--bad)" : "var(--ink-faint)" }}>
          {note.text}
        </p>
      )}

      {groups && groups.length > 0 && (
        <div className="import-groups">
          {groups.map((g) => (
            <div className="import-row" key={g.source}>
              <div className="import-main">
                <span className="mono">{g.source}</span>
                <span className="hint">{t("backup.skillsCount", { n: g.skills.length })}</span>
              </div>
              <button className="btn" onClick={() => installGroup(g)} disabled={busySource === g.source}>
                {busySource === g.source ? t("modal.starting") : t("backup.installBtn")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Recent operations card, fed from the main-process history log. */
function HistoryCard() {
  const { t } = useI18n();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.history().then((r) => setItems(r?.items || []));
  }, []);

  const labelOf = (l) => {
    const k = `runBar.labels.${l}`;
    return t(k) === k ? l : t(k);
  };

  return (
    <div className="set-card">
      <h3>{t("history.title")}</h3>
      <p className="hint">{t("history.hint")}</p>
      {items === null && <p className="hint">{t("viewer.loading")}</p>}
      {items?.length === 0 && <p className="hint">{t("history.empty")}</p>}
      {items?.length > 0 && (
        <div className="hist-list">
          {items.slice(0, 25).map((h, i) => (
            <div className="hist-row" key={i}>
              <span className={`status-pill ${h.code === 0 ? "ok" : "failed"}`}>
                {h.code === 0 ? t("runBar.done") : t("runBar.failed")}
              </span>
              <b>{labelOf(h.label)}</b>
              <span className="hint">{new Date(h.at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Settings({ cwd, setCwd, lang, setLang }) {
  const { t } = useI18n();

  const choose = async () => {
    const dir = await api.pickFolder();
    if (dir) setCwd(dir);
  };

  return (
    <section>
      <h2 className="view-title">{t("settings.title")}</h2>
      <p className="view-sub">{t("settings.cwdHint")}</p>

      <div className="set-grid">
        <div className="set-card">
          <h3>{t("settings.projectDir")}</h3>
          <p className="hint">{t("settings.cwdHint")}</p>
          <div className="dir-row">
            <span className="path" title={cwd}>
              {cwd || "—"}
            </span>
            <button className="btn" onClick={choose}>
              {t("settings.pick")}
            </button>
            <button className="btn-quiet" onClick={() => api.openPath(cwd)}>
              {t("settings.lastResort")}
            </button>
          </div>
        </div>

        <div className="set-card">
          <h3>{t("settings.language")}</h3>
          <div className="lang-toggle">
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              English
            </button>
            <button aria-pressed={lang === "ar"} onClick={() => setLang("ar")}>
              العربية
            </button>
          </div>
        </div>

        <BackupCard cwd={cwd} />
        <HistoryCard />
      </div>
    </section>
  );
}
