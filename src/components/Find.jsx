import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";
import { fmtInstalls, looksLikeRepo, normalizePkg } from "../lib/packages.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";
import InstallModal from "./InstallModal.jsx";

/** How long typing stays quiet before the search fires, and the smallest
 *  query the skills.sh API accepts (≥ 2 chars). */
const LIVE_DELAY = 400;
const MIN_QUERY = 2;

export default function Find({ cwd, onDone }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [note, setNote] = useState(null); // { kind: "info" | "error", text }
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // { source, preselect }
  const seqRef = useRef(0); // cancels stale responses while the user keeps typing

  // live search: rerun whenever the (debounced) input settles
  const settledQuery = useDebouncedValue(query, LIVE_DELAY);

  const search = useCallback(async (raw) => {
    const term = String(raw || "").trim();
    if (term.length < MIN_QUERY || looksLikeRepo(term)) return;

    const seq = ++seqRef.current;
    const isStale = () => seq !== seqRef.current;
    setBusy(true);
    setNote(null);

    // path 1 — skills.sh web search (online)
    const web = await api.webSearch(term).catch(() => null);
    if (isStale()) return;
    if (web?.ok) {
      const items = web.items.map((r) => ({
        ...r,
        installsText: r.installsText || fmtInstalls(r.installs),
      }));
      setResults(items);
      setBusy(false);
      if (!items.length) setNote({ kind: "info", text: t("search.resultsEmpty") });
      return;
    }

    // path 2 — the CLI itself (`npx skills find`) when skills.sh is unreachable
    const cli = await api.find({ query: term }).catch(() => null);
    if (isStale()) return;
    setBusy(false);
    if (cli?.ok && cli.items?.length) {
      setResults(cli.items);
      setNote({ kind: "info", text: t("search.onlineError") });
    } else {
      setResults([]);
      setNote({ kind: "error", text: t("search.resultsEmpty") });
    }
  }, [t]);

  useEffect(() => {
    if (looksLikeRepo(settledQuery.trim())) {
      // a repo is previewed, not searched — cancel any in-flight search
      seqRef.current += 1;
      setBusy(false);
      setResults([]);
      setNote(null);
      return;
    }
    search(settledQuery);
  }, [settledQuery, search]);

  return (
    <section>
      <h2 className="view-title">{t("search.title")}</h2>
      <p className="view-sub">{t("search.inputLabel")}</p>

      <div className="searchbox">
        <input
          autoFocus
          value={query}
          placeholder="react best practices · anthropics/skills · https://github.com/…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search(query)}
          aria-label={t("search.inputLabel")}
        />
        <button className="btn-primary" onClick={() => search(query)} disabled={busy || query.trim().length < MIN_QUERY}>
          {t("search.searchBtn")}
        </button>
      </div>

      {busy && <p className="hint" style={{ marginTop: 10 }}>{t("search.searching")}</p>}
      {!busy && query.trim().length > 0 && query.trim().length < MIN_QUERY && (
        <p className="hint" style={{ marginTop: 10 }}>{t("search.minChars")}</p>
      )}

      {looksLikeRepo(query.trim()) && (
        <p className="hint" style={{ marginTop: 10 }}>
          <button
            className="btn btn-quiet"
            style={{ padding: "4px 10px" }}
            onClick={() => setModal({ source: normalizePkg(query), preselect: null })}
          >
            {t("search.previewBtn")} — <span className="mono">{normalizePkg(query)}</span>
          </button>
        </p>
      )}

      {note && (
        <p
          className="hint"
          style={{ color: note.kind === "error" ? "var(--bad)" : "var(--ink-faint)", marginTop: 14 }}
        >
          {note.text}
        </p>
      )}

      <div className="results">
        {results.map((r) => (
          <div className="result-row" key={r.id || r.name}>
            <div className="result-main">
              <div className="result-name">{r.name}</div>
              <div className="result-src">{r.source}</div>
            </div>
            <span className="installs">
              <span className="stat-num">{r.installsText}</span> {t("search.installs")}
            </span>
            <button
              className="btn"
              onClick={() => setModal({ source: r.source, preselect: r.skillId })}
            >
              {t("search.previewBtn")}
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <InstallModal
          source={modal.source}
          preselect={modal.preselect}
          cwd={cwd}
          onClose={() => setModal(null)}
          onDone={onDone}
        />
      )}
    </section>
  );
}
