import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, FlatFile } from "../types";
import { flattenFiles } from "../utils/wikiLinks";
import { basename } from "../utils/paths";

interface SearchModalProps {
  vaultPath: string | null;
  flatFiles: FlatFile[];
  fileContents: Record<string, string>;
  recentVaults: string[];
  onOpenResult: (vaultPath: string, filePath: string) => void;
  onClose: () => void;
}

interface VaultData {
  files: FlatFile[];
  contents: Record<string, string>;
}

interface SearchResult {
  vaultPath: string;
  file: FlatFile;
  snippet: string;
}

const SNIPPET_RADIUS_BEFORE = 40;
const SNIPPET_RADIUS_AFTER = 60;
const MAX_RESULTS = 80;

export function SearchModal({
  vaultPath,
  flatFiles,
  fileContents,
  recentVaults,
  onOpenResult,
  onClose,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"vault" | "all">("vault");
  const [otherVaults, setOtherVaults] = useState<Record<string, VaultData>>({});
  const [loadingAll, setLoadingAll] = useState(false);

  const otherVaultPaths = useMemo(
    () => recentVaults.filter((p) => p !== vaultPath),
    [recentVaults, vaultPath],
  );

  useEffect(() => {
    if (scope !== "all") return;
    const missing = otherVaultPaths.filter((p) => !(p in otherVaults));
    if (missing.length === 0) return;

    let cancelled = false;
    setLoadingAll(true);

    (async () => {
      const updates: Record<string, VaultData> = {};
      for (const vp of missing) {
        try {
          const entries = await invoke<FileEntry[]>("list_vault", { vaultPath: vp });
          const files = flattenFiles(entries);
          const contents: Record<string, string> = {};
          await Promise.all(
            files.map(async (f) => {
              try {
                contents[f.path] = await invoke<string>("read_file", { path: f.path });
              } catch {
                contents[f.path] = "";
              }
            }),
          );
          updates[vp] = { files, contents };
        } catch {
          updates[vp] = { files: [], contents: {} };
        }
      }
      if (!cancelled) {
        setOtherVaults((prev) => ({ ...prev, ...updates }));
        setLoadingAll(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, otherVaultPaths, otherVaults]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const collections: { vaultPath: string; files: FlatFile[]; contents: Record<string, string> }[] = [
      { vaultPath: vaultPath ?? "", files: flatFiles, contents: fileContents },
    ];

    if (scope === "all") {
      for (const vp of otherVaultPaths) {
        const data = otherVaults[vp];
        if (data) collections.push({ vaultPath: vp, files: data.files, contents: data.contents });
      }
    }

    const out: SearchResult[] = [];

    outer: for (const { vaultPath: vp, files, contents } of collections) {
      for (const file of files) {
        const text = contents[file.path] ?? "";
        const nameMatch = file.name.toLowerCase().includes(q);
        const idx = text.toLowerCase().indexOf(q);
        if (!nameMatch && idx === -1) continue;

        let snippet = "";
        if (idx !== -1) {
          const start = Math.max(0, idx - SNIPPET_RADIUS_BEFORE);
          const end = Math.min(text.length, idx + q.length + SNIPPET_RADIUS_AFTER);
          snippet =
            (start > 0 ? "…" : "") +
            text.slice(start, end).replace(/\s+/g, " ").trim() +
            (end < text.length ? "…" : "");
        }

        out.push({ vaultPath: vp, file, snippet });
        if (out.length >= MAX_RESULTS) break outer;
      }
    }

    return out;
  }, [query, scope, vaultPath, flatFiles, fileContents, otherVaultPaths, otherVaults]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Search</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="search-controls">
          <input
            className="field-input search-input"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes by title or content…"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <div className="search-scope">
            <button
              type="button"
              className={`scope-btn${scope === "vault" ? " active" : ""}`}
              onClick={() => setScope("vault")}
            >
              This Vault
            </button>
            <button
              type="button"
              className={`scope-btn${scope === "all" ? " active" : ""}`}
              onClick={() => setScope("all")}
              disabled={otherVaultPaths.length === 0}
              title={
                otherVaultPaths.length === 0
                  ? "No other recent vaults"
                  : "Search across all recently opened vaults"
              }
            >
              All Vaults{otherVaultPaths.length > 0 ? ` (${otherVaultPaths.length + 1})` : ""}
            </button>
          </div>
        </div>

        {scope === "all" && loadingAll && <p className="modal-hint">Indexing other vaults…</p>}

        <div className="search-results">
          {query.trim() === "" ? (
            <p className="modal-hint">
              Type to search {scope === "all" ? "across all vaults" : "this vault"}.
            </p>
          ) : results.length === 0 ? (
            <p className="modal-hint">No results.</p>
          ) : (
            results.map((r) => (
              <button
                key={`${r.vaultPath}:${r.file.path}`}
                type="button"
                className="search-result"
                onClick={() => onOpenResult(r.vaultPath, r.file.path)}
              >
                <div className="search-result-title">
                  <span>{r.file.name.replace(/\.md$/i, "")}</span>
                  {scope === "all" && (
                    <span className="search-result-vault">{basename(r.vaultPath)}</span>
                  )}
                </div>
                {r.snippet && <div className="search-result-snippet">{r.snippet}</div>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
