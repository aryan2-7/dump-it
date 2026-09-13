import { FileTree } from "./FileTree";
import type { FileEntry } from "../types";

interface SidebarProps {
  vaultPath: string | null;
  tree: FileEntry[];
  activeFile: string | null;
  onOpenVault: () => void;
  onSelectFile: (path: string) => void;
}

function vaultLabel(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function Sidebar({
  vaultPath,
  tree,
  activeFile,
  onOpenVault,
  onSelectFile,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">dump-it</span>
        <button type="button" className="btn-ghost" onClick={onOpenVault} title="Open vault">
          {vaultPath ? "Switch" : "Open Vault"}
        </button>
      </div>

      {vaultPath ? (
        <>
          <div className="vault-name" title={vaultPath}>
            {vaultLabel(vaultPath)}
          </div>
          <div className="sidebar-tree">
            {tree.length === 0 ? (
              <p className="sidebar-empty">No markdown files found</p>
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
