import { FileTree } from "./FileTree";
import type { FileEntry } from "../types";

interface SidebarProps {
  width: number;
  vaultPath: string | null;
  tree: FileEntry[];
  activeFile: string | null;
  onOpenVault: () => void;
  onSelectFile: (path: string) => void;
  onNewNote: () => void;
}

function vaultLabel(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function Sidebar({
  width,
  vaultPath,
  tree,
  activeFile,
  onOpenVault,
  onSelectFile,
  onNewNote,
}: SidebarProps) {
  return (
    <aside className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <span className="sidebar-logo">dump-it</span>
        <button type="button" className="btn-ghost" onClick={onOpenVault} title="Open vault">
          {vaultPath ? "Switch" : "Open Vault"}
        </button>
      </div>

      {vaultPath ? (
        <>
          <div className="sidebar-actions">
            <div className="vault-name" title={vaultPath}>
              {vaultLabel(vaultPath)}
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
          <div className="sidebar-tree">
            {tree.length === 0 ? (
              <div className="sidebar-empty-state">
                <p className="sidebar-empty">No markdown files yet</p>
                <button type="button" className="btn-primary btn-sm" onClick={onNewNote}>
                  Create first note
                </button>
              </div>
            ) : (
              <FileTree entries={tree} activeFile={activeFile} onSelect={onSelectFile} />
            )}
          </div>
        </>
      ) : (
        <div className="sidebar-welcome">
          <p>Open a folder to use as your vault.</p>
          <button type="button" className="btn-primary" onClick={onOpenVault}>
            Open Vault Folder
          </button>
        </div>
      )}
    </aside>
  );
}
