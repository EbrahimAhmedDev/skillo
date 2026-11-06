import React, { useEffect, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

/** Health check: verifies every installed skill's folder + SKILL.md still
 *  exist, and whether a skills-lock.json is present in the project. */
export default function HealthModal({ cwd, onClose, onRunDone }) {
  const { t } = useI18n();
  const [state, setState] = useState("running"); // running | done
  const [report, setReport] = useState(null);

  const run = async () => {
    setState("running");
    const r = await api.doctor({ cwd });
    setReport(r);
    setState("done");
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal" onKeyDown={(e) => e.key === "Escape" && onClose()}>
        <h3>{t("health.title")}</h3>
        <p className="hint">{t("health.hint")}</p>

        {state === "running" && <p className="hint">{t("health.running")}</p>}

        {state === "done" && report && (
          <div className="health-report">
            {report.ok ? (
              <p className="hint" style={{ color: "var(--ok)" }}>✓ {t("health.allGood")}</p>
            ) : (
              <>
                <span className="field-label">{t("health.issues", report.issues.length)}</span>
                <div className="issue-list">
                  {report.issues.map((x, i) => (
                    <div className="issue-row" key={i}>
                      <span className={`status-pill ${x.kind === "list-failed" ? "failed" : "warn"}`}>
                        {t(`health.kinds.${x.kind}`)}
                      </span>
                      <div className="issue-detail">
                        {(x.name || x.scope) && <b>{x.name || x.scope}</b>}
                        <span className="path" title={x.path || ""}>{x.path || x.detail || ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="issue-row">
              <span className={`status-pill ${report.lockfile ? "ok" : "warn"}`}>
                {report.lockfile ? t("health.lockYes") : t("health.lockNo")}
              </span>
              <div className="issue-detail"><span className="hint">skills-lock.json</span></div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-quiet" onClick={run} disabled={state === "running"}>
            {t("health.runAgain")}
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onRunDone?.();
              onClose();
            }}
          >
            {t("modal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
