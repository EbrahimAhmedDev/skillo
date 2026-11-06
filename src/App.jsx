import React, { useEffect, useState } from "react";
import api from "./api.js";
import { useI18n } from "./i18n.jsx";
import Skills from "./components/Skills.jsx";
import Find from "./components/Find.jsx";
import Advanced from "./components/Advanced.jsx";
import Settings from "./components/Settings.jsx";
import RunBar from "./components/RunBar.jsx";
import icons from "./components/icons.jsx";

export default function App() {
  const { t, lang, setLang, dir } = useI18n();
  const [view, setView] = useState("skills");
  const [scope, setScope] = useState("project");
  const [cwd, setCwd] = useState(() => localStorage.getItem("skillo.cwd") || "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!cwd) {
      api.defaultCwd().then((d) => d && saveCwd(d)).catch(() => {});
    }
  }, []);

  const saveCwd = (d) => {
    localStorage.setItem("skillo.cwd", d);
    setCwd(d);
  };

  const toast = (text, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  };

  const pickFolder = async () => {
    const d = await api.pickFolder();
    if (d) {
      saveCwd(d);
      setRefreshKey((k) => k + 1);
    }
  };

  const nav = [
    ["skills", t("nav.skills")],
    ["find", t("nav.find")],
    ["advanced", t("nav.advanced")],
    ["settings", t("nav.settings")],
  ];

  return (
    <div className="frame" dir={dir}>
      <header className="topbar">
        <div className="wordmark">
          Skil<span>lo</span>
        </div>
        <span className="hint" style={{ marginBottom: 0 }}>{t("tagline")}</span>
        <div className="spacer" />
        <div className="top-cwd">
          <svg width="14" height="14" viewBox="0 0 24 24" style={{ stroke: "var(--ink-faint)", fill: "none", strokeWidth: 1.6 }} aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
          </svg>
          <span className="path" title={cwd}>
            {cwd || "…"}
          </span>
          <button className="btn-quiet" style={{ padding: "2px 8px" }} onClick={pickFolder}>
            {t("settings.pick")}
          </button>
        </div>
        <div className="lang-toggle">
          <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          <button aria-pressed={lang === "ar"} onClick={() => setLang("ar")}>AR</button>
        </div>
      </header>

      <div className="mainrails">
        <nav className="rail" aria-label="main">
          {nav.map(([id, label]) => (
            <button key={id} aria-current={view === id} onClick={() => setView(id)}>
              {icons[id]}
              <span>{label}</span>
            </button>
          ))}
          <footer>
            powered by
            <div className="cmdline">npx skills</div>
          </footer>
        </nav>

        <main className="content">
          {view === "skills" && (
            <Skills cwd={cwd} scope={scope} setScope={setScope} refreshKey={refreshKey} />
          )}
          {view === "find" && (
            <Find
              cwd={cwd}
              onDone={() => {
                setScope("project");
                setView("skills");
                setRefreshKey((k) => k + 1);
                toast(t("toast.added"));
              }}
            />
          )}
          {view === "advanced" && <Advanced cwd={cwd} />}
          {view === "settings" && (
            <Settings cwd={cwd} setCwd={saveCwd} lang={lang} setLang={setLang} />
          )}
        </main>
      </div>

      <RunBar />

      <div className="toasts" aria-live="polite">
        {toasts.map((x) => (
          <div className={`toast ${x.kind === "failed" ? "failed" : ""}`} key={x.id}>
            {x.text}
          </div>
        ))}
      </div>
    </div>
  );
}
