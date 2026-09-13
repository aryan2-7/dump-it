import { useState } from "react";
import { FileTree } from "./FileTree";
import { TagList } from "./TagList";
import type { FileEntry, FlatFile } from "../types";
import { basename } from "../utils/paths";

interface SidebarProps {
  width: number;
  vaultPath: string | null;
  tree: FileEntry[];
  activeFile: string | null;
  tagIndex: Map<string, FlatFile[]>;
  onOpenVault: () => void;
  onSelectFile: (path: string) => void;
  onNewNote: () => void;
}

export function Sidebar({
  width,
  vaultPath,
  tree,
  activeFile,
  tagIndex,
  onOpenVault,
  onSelectFile,
  onNewNote,
}: SidebarProps) {
  const [view, setView] = useState<"files" | "tags">("files");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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
        </div>
      )}
    </aside>
  );
}
