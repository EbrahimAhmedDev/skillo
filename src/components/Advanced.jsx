import React, { useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

export default function Advanced({ cwd }) {
  const { t } = useI18n();
  const [dryLock, setDryLock] = useState(true);
  const [drySync, setDrySync] = useState(true);

  return (
    <section>
      <h2 className="view-title">{t("advanced.title")}</h2>
      <p className="view-sub" style={{ color: "var(--accent)" }}>
        {t("advanced.experimental")}
      </p>

      <div className="adv-grid">
        <div className="adv-card">
          <h3>{t("advanced.syncTitle")}</h3>
          <p>{t("advanced.syncHint")}</p>
          <span className="cmdline">npx skills experimental_sync{drySync ? " --dry-run" : " -y"}</span>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <label className="field-row">
              <input type="checkbox" checked={drySync} onChange={(e) => setDrySync(e.target.checked)} />
              {t("advanced.dryRun")}
            </label>
            <button className="btn-primary" onClick={() => api.sync({ cwd, dryRun: drySync })}>
              {t("advanced.run")}
            </button>
          </div>
        </div>

        <div className="adv-card">
          <h3>{t("advanced.lockTitle")}</h3>
          <p>{t("advanced.lockHint")}</p>
          <span className="cmdline">
            npx skills experimental_install{dryLock ? " --dry-run" : " --no-frozen-lockfile"}
          </span>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <label className="field-row">
              <input type="checkbox" checked={dryLock} onChange={(e) => setDryLock(e.target.checked)} />
              {t("advanced.dryRun")}
            </label>
            <button className="btn-primary" onClick={() => api.installLock({ cwd, dryRun: dryLock })}>
              {t("advanced.run")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
