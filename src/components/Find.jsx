import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "../api.js";
import { useI18n } from "../i18n.jsx";
import { fmtInstalls, looksLikeRepo, normalizePkg } from "../lib/packages.js";
import { useDebouncedValue } from "../lib/useDebouncedValue.js";
import InstallModal from "./InstallModal.jsx";

/** How long typing stays quiet before the search fires, and the smallest
 *  query the skills.sh API accepts (≥ 2 chars). */
const LIVE_DELAY = 250;
const MIN_QUERY = 2;

export default function Find({ cwd, onDone }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [note, setNote] = useState(null); // { kind: "info" | "error", text }
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // { source, preselect }

  // Speed kit: a generation counter cancels stale responses, the cache makes
  // revisited queries instant, and shortening a query filters the previous
  // (longer) result set locally instead of hitting the network again.
  const seqRef = useRef(0);
  const cacheRef = useRef(new Map()); // query → items
  const fullRef = useRef(null); // { term, items } of the last network result

  // live search: rerun whenever the (debounced) input settles
  const settledQuery = useDebouncedValue(query, LIVE_DELAY);

  const apply = useCallback((items, note) => {
    setResults(items);
    setNote(note);
  }, []);

  const search = useCallback(
    async (raw) => {
      const term = String(raw || "").trim();
      const mySeq = ++seqRef.current;
      const stale = () => mySeq !== seqRef.current;

      if (term.length < MIN_QUERY || looksLikeRepo(term)) {
        setBusy(false);
        if (term.length < MIN_QUERY) apply([], null);
        return;
      }

      setNote(null);

      // 1) exact cache hit — instant
      if (cacheRef.current.has(term)) {
        setBusy(false);
        const items = cacheRef.current.get(term);
        apply(items, items.length ? null : { kind: "info", text: t("search.resultsEmpty") });
        return;
      }

      // 2) the new query is a prefix of the last network search → filter its
      //    (unfiltered) result set locally, no network round-trip
      const full = fullRef.current;
      if (full && full.fullSet.length && full.term.startsWith(term)) {
        setBusy(false);
        const needle = term.toLowerCase();
        const items = full.fullSet.filter(
          (r) =>
            String(r.name).toLowerCase().includes(needle) ||
            String(r.source).toLowerCase().includes(needle),
        );
        apply(items, items.length ? null : { kind: "info", text: t("search.resultsEmpty") });
        return;
      }

      // 3) network — skills.sh search, then the CLI as fallback
      setBusy(true);
      const web = await api.webSearch(term).catch(() => null);
      if (stale()) return; // a newer keystroke already took over
      if (web?.ok) {
        const items = web.items.map((r) => ({
          ...r,
          installsText: r.installsText || fmtInstalls(r.installs),
        }));
        cacheRef.current.set(term, items);
        fullRef.current = { term, fullSet: items };
        setBusy(false);
        apply(items, items.length ? null : { kind: "info", text: t("search.resultsEmpty") });
        return;
      }

      const cli = await api.find({ query: term }).catch(() => null);
      if (stale()) return;
      setBusy(false);
      if (cli?.ok && cli.items?.length) {
        cacheRef.current.set(term, cli.items);
        fullRef.current = { term, fullSet: cli.items };
        apply(cli.items, { kind: "info", text: t("search.onlineError") });
      } else {
        apply([], { kind: "error", text: t("search.resultsEmpty") });
      }
    },
    [apply, t],
  );

  useEffect(() => {
    void search(settledQuery);
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
        <button
          className="btn-primary"
          onClick={() => search(query)}
          disabled={busy || query.trim().length < MIN_QUERY}
        >
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
