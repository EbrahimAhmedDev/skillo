import React from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

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
      </div>
    </section>
  );
}
