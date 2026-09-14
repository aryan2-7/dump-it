import { useEffect, useRef, useState } from "react";
import { FileTree } from "./FileTree";
import { TagList } from "./TagList";
import type { FileEntry, FlatFile } from "../types";
import { basename } from "../utils/paths";

interface SidebarProps {
  width: number;
  vaultPath: string | null;
  recentVaults: string[];
  tree: FileEntry[];
  activeFile: string | null;
  tagIndex: Map<string, FlatFile[]>;
  onOpenVault: () => void;
  onSwitchVault: (path: string) => void;
  onSelectFile: (path: string) => void;
  onNewNote: () => void;
}

export function Sidebar({
  width,
  vaultPath,
  recentVaults,
  tree,
  activeFile,
  tagIndex,
  onOpenVault,
  onSwitchVault,
  onSelectFile,
  onNewNote,
}: SidebarProps) {
  const [view, setView] = useState<"files" | "tags">("files");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showVaultMenu, setShowVaultMenu] = useState(false);
  const vaultMenuRef = useRef<HTMLDivElement>(null);

  const otherVaults = recentVaults.filter((p) => p !== vaultPath);

  useEffect(() => {
    if (!showVaultMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!vaultMenuRef.current?.contains(e.target as Node)) {
        setShowVaultMenu(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [showVaultMenu]);

  return (
    <aside className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <span className="sidebar-logo">dump-it</span>
        <div className="vault-switcher" ref={vaultMenuRef}>
          <button type="button" className="btn-ghost" onClick={onOpenVault} title="Open vault">
            {vaultPath ? "Switch" : "Open Vault"}
          </button>
          {vaultPath && otherVaults.length > 0 && (
            <>
              <button
                type="button"
                className="btn-ghost btn-vault-menu"
                onClick={() => setShowVaultMenu((v) => !v)}
                title="Recent vaults"
                aria-label="Recent vaults"
              >
                ⌄
              </button>
              {showVaultMenu && (
                <div className="vault-menu">
                  {otherVaults.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="vault-menu-item"
                      title={p}
                      onClick={() => {
                        setShowVaultMenu(false);
                        onSwitchVault(p);
                      }}
                    >
                      {basename(p)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {vaultPath ? (
        <>
          <div className="sidebar-actions">
            <div className="vault-name" title={vaultPath}>
              {basename(vaultPath)}
            </div>
            <button
              type="button"
              className="btn-new-note"
              onClick={onNewNote}
              title="New note"
            >
              +
            </button>
          </div>

          <div className="sidebar-tabs">
            <button
              type="button"
              className={`sidebar-tab${view === "files" ? " active" : ""}`}
              onClick={() => setView("files")}
            >
              Files
            </button>
            <button
              type="button"
              className={`sidebar-tab${view === "tags" ? " active" : ""}`}
              onClick={() => setView("tags")}
            >
              Tags{tagIndex.size > 0 ? ` (${tagIndex.size})` : ""}
            </button>
          </div>

          <div className="sidebar-tree">
            {view === "files" ? (
              tree.length === 0 ? (
                <div className="sidebar-empty-state">
                  <p className="sidebar-empty">No markdown files yet</p>
                  <button type="button" className="btn-primary btn-sm" onClick={onNewNote}>
                    Create first note
                  </button>
                </div>
              ) : (
                <FileTree entries={tree} activeFile={activeFile} onSelect={onSelectFile} />
              )
            ) : (
              <TagList
                tagIndex={tagIndex}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
              />
            )}
          </div>
        </>
      ) : (
        <div className="sidebar-welcome">
          <p>Open a folder to use as your vault.</p>
          <button type="button" className="btn-primary" onClick={onOpenVault}>
            Open Vault Folder
          </button>
          {recentVaults.length > 0 && (
            <div className="recent-vaults-list">
              <p className="recent-vaults-label">Recent vaults</p>
              {recentVaults.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="btn-ghost recent-vault-item"
                  title={p}
                  onClick={() => onSwitchVault(p)}
                >
                  {basename(p)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
