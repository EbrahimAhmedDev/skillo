import React, { useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";

/** Loose validity for a skill folder name (letters/digits/-/_/. — no paths). */
const NAME_RE = /^[a-zA-Z0-9][\w.-]*$/;

/** Dedicated "New skill" screen: scaffolds a local skill via
 *  `npx skills init <name>` in the chosen project folder, then fills in the
 *  description the user typed. */
export default function Create({ cwd }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null); // { folder, folderName, descOk }

  const clean = name.trim().replace(/\s+/g, "-");
  const valid = NAME_RE.test(clean) && cwd;

  const create = async () => {
    setBusy(true);
    setError(null);
    const folder = `${cwd}/${clean}`;
    const r = await api.init({ cwd, name: clean });

    let descOk = true;
    if (r?.ok && description.trim()) {
      descOk = (await api.patchDescription({ dir: folder, description })).ok;
    }

    setBusy(false);
    if (r?.ok) {
      setCreated({ folder, folderName: clean, descOk });
      setDescription("");
      setName("");
    } else {
      setError(r?.error || "failed");
    }
  };

  return (
    <section>
      <h2 className="view-title">{t("create.title")}</h2>
      <p className="view-sub">{t("create.sub")}</p>

      <div className="create-card">
        {created ? (
          <>
            <h3>
              <span style={{ color: "var(--accent)" }}>✓</span> {t("create.doneTitle")}
            </h3>
            <p className="hint">
              <span className="path">{created.folder}</span>
            </p>
            {!created.descOk && <p className="hint" style={{ color: "var(--bad)" }}>{t("create.descFailed")}</p>}
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <button className="btn" onClick={() => api.openPath(created.folder)}>
                {t("create.open")}
              </button>
              <button className="btn-quiet" onClick={() => setCreated(null)}>
                {t("create.again")}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="field-label">{t("create.name")}</span>
            <div className="create-name">
              <span className="mono path" style={{ maxWidth: 260 }}>
                {cwd || "…"}
              </span>
              <span className="mono">/</span>
              <input
                type="text"
                value={name}
                placeholder={t("create.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && valid && create()}
                autoFocus
              />
            </div>
            {name.trim() && !NAME_RE.test(clean) && (
              <p className="hint" style={{ color: "var(--bad)" }}>{t("create.nameInvalid")}</p>
            )}

            <span className="field-label">{t("create.description")}</span>
            <input
              type="text"
              value={description}
              placeholder={t("create.descPlaceholder")}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="hint" style={{ marginTop: 4 }}>{t("create.descHint")}</p>

            <div className="toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
              <span className="cmdline">npx skills init {clean || "<name>"}</span>
              <span style={{ flex: 1 }} />
              <button className="btn-primary" onClick={create} disabled={!valid || busy}>
                {busy ? t("create.creating") : t("create.create")}
              </button>
            </div>
            {!cwd && (
              <p className="hint" style={{ color: "var(--bad)" }}>{t("create.noCwd")}</p>
            )}
            {error && (
              <p className="hint" style={{ color: "var(--bad)" }}>{error}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
