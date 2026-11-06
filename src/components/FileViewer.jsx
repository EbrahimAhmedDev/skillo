import React, { useEffect, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

/** Modal file viewer: shows a SKILL.md side by side with its source path. */
export default function FileViewer({ filePath, onClose }) {
  const { t } = useI18n();
  const [state, setState] = useState("loading"); // loading | ready | error
  const [content, setContent] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    api.readSkillFile(filePath).then((r) => {
      if (cancelled) return;
      if (r?.ok) {
        setContent(r.content);
        setState("ready");
      } else {
        setState("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal viewer-modal" onKeyDown={(e) => e.key === "Escape" && onClose()}>
        <div className="viewer-head">
          <h3>{t("viewer.title")}</h3>
          <span className="path mono" title={filePath}>
            {filePath}
          </span>
        </div>
        {state === "loading" && <p className="hint mono">{t("viewer.loading")}</p>}
        {state === "error" && <p className="hint" style={{ color: "var(--bad)" }}>{t("viewer.missing")}</p>}
        {state === "ready" && <pre className="viewer-body mono">{content}</pre>}
        <div className="modal-actions">
          <button className="btn" onClick={() => api.openPath(filePath)}>
            {t("viewer.openInEditor")}
          </button>
          <button className="btn-quiet" onClick={onClose}>
            {t("modal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
