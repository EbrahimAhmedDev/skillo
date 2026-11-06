import React, { useEffect, useRef, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

/**
 * The persistent live strip: every `npx skills` invocation surfaces here with
 * its command line and the last thing the CLI printed, expanded into a full
 * log on demand.
 */
/** Resolve a run label to i18n, falling back to the raw label. */
const runLabel = (t, label) => {
  const key = `runBar.labels.${label}`;
  const translated = t(key);
  return translated === key ? label : translated;
};

export default function RunBar() {
  const { t } = useI18n();
  const [jobs, setJobs] = useState([]);
  const [open, setOpen] = useState(false);
  const jobsRef = useRef(jobs);

  useEffect(() => {
    const patch = (id, fn) =>
      setJobs((prev) => (jobsRef.current = prev).map((j) => (j.id === id ? fn(j) : j)));

    const upsert = (id, fn) => {
      let found = false;
      setJobs((prev) => {
        const next = prev.some((j) => j.id === id)
          ? prev.map((j) => (j.id === id ? fn(j) : j))
          : [...prev, fn({ id, cmd: "", label: "", lines: [], status: "running" })];
        jobsRef.current = next;
        return next;
      });
    };

    const off1 = api.onRunStarted?.((p) => {
      upsert(p.id, () => ({ id: p.id, cmd: p.cmd, label: p.label, lines: [], status: "running" }));
    });
    const off2 = api.onRunStream?.(({ id, text }) => {
      patch(id, (j) => ({ ...j, lines: [...j.lines, text].slice(-800) }));
    });
    const off3 = api.onRunDone?.(({ id, code }) => {
      patch(id, (j) => ({ ...j, status: code === 0 ? "ok" : "failed" }));
    });
    return () => {
      off1?.(); off2?.(); off3?.();
    };
  }, []);

  const running = jobs.filter((j) => j.status === "running");
  const current = running[running.length - 1] || jobs[jobs.length - 1] || null;
  // the strip shows the command (always short); raw output lives in the log
  const liveText = current?.cmd || "";

  return (
    <section className="runbar" aria-label={t("runBar.log")}>
      <div className="runbar-strip">
        <div className="runbar-latest">
          {current ? (
            <div className="live-label">
              {current.status === "running" ? (
                <span className="dotspin" aria-hidden="true" />
              ) : (
                <span className={`status-pill ${current.status}`}>
                  {current.status === "ok" ? t("runBar.done") : t("runBar.failed")}
                </span>
              )}
              <b>{runLabel(t, current.label)}</b>
              <span className="live-line mono" title={liveText}>
                {liveText}
              </span>
            </div>
          ) : (
            <span className="live-label" style={{ color: "var(--ink-faint)" }}>
              {t("runBar.idle")}
              <span className="live-line mono">npx skills — ready</span>
            </span>
          )}
        </div>
        <button className="btn-quiet" onClick={() => setOpen(!open)}>
          {open ? t("runBar.collapse") : t("runBar.expand")}
        </button>
      </div>

      {open && (
        <div className="runbar-log">
          {jobs.length === 0 ? (
            <p className="hint">{t("runBar.noJobs")}</p>
          ) : (
            [...jobs].reverse().map((j) => (
              <div className="log-block" key={j.id}>
                <div className="log-head">
                  <span className={`status-pill ${j.status}`}>
                    {j.status === "ok" ? t("runBar.done") : j.status === "failed" ? t("runBar.failed") : t("runBar.running")}
                  </span>
                  <b>{runLabel(t, j.label)}</b>
                  <span className="log-cmd">{j.cmd}</span>
                </div>
                {j.lines.length > 0 && (
                  <pre className="log-body">{j.lines.join("")}</pre>
                )}
              </div>
            ))
          )}
          {jobs.length > 0 && (
            <button className="btn-quiet" onClick={() => { jobsRef.current = []; setJobs([]); }}>
              {t("runBar.clear")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
