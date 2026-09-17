import { useEffect, useRef, useState } from "react";
import { FileTree } from "./FileTree";
import { TagList } from "./TagList";
import { ChevronDownIcon, FilePlusIcon, FolderPlusIcon } from "./icons";
import type { FileEntry, FlatFile } from "../types";
import { basename } from "../utils/paths";

interface NewFolderDialogProps {
  /** Folder the new folder will be created in — shown as a hint, vault root when null. */
  locationHint?: string | null;
  onCreate: (name: string) => Promise<string | null>;
  onClose: () => void;
}

function NewFolderDialog({ locationHint, onCreate, onClose }: NewFolderDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await onCreate(trimmed);
      if (created) {
        onClose();
      } else {
        setError("Could not create folder.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal new-note-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Folder</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="field-label" htmlFor="folder-name">
          Folder name
        </label>
        {locationHint && <p className="modal-hint modal-hint-tight">Creates in: <strong>{locationHint}</strong></p>}
        <input
          id="folder-name"
          className="field-input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Folder"
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
            if (e.key === "Escape") onClose();
          }}
        />
        {error && <p className="modal-error">{error}</p>}

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!name.trim() || busy}
            onClick={() => void submit()}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MoveDialogProps {
  sourceName: string;
  folders: { path: string; name: string; depth: number }[];
  vaultName: string;
  onPick: (destinationDir: string) => Promise<void>;
  onClose: () => void;
}

function MoveDialog({ sourceName, folders, vaultName, onPick, onClose }: MoveDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const pick = async (dest: string) => {
    if (busy) return;
    setBusy(dest);
    setError(null);
    try {
      await onPick(dest);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal new-note-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Move “{sourceName}”</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="modal-hint">Choose a destination folder.</p>
        <div className="move-list">
          <button
            type="button"
            className="move-item"
            disabled={busy !== null}
            onClick={() => void pick("__vault_root__")}
          >
            <span className="move-item-icon">⌂</span>
            {vaultName}
            <span className="move-item-tag">vault root</span>
          </button>
          {folders.map((folder) => (
            <button
              key={folder.path}
              type="button"
              className="move-item"
              disabled={busy !== null}
              style={{ paddingLeft: `${12 + folder.depth * 14}px` }}
              onClick={() => void pick(folder.path)}
            >
              <span className="move-item-icon">▸</span>
              {folder.name}
            </button>
          ))}
          {folders.length === 0 && <p className="sidebar-empty">No folders yet — create one first.</p>}
        </div>
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function collectFolders(entries: FileEntry[], depth: number, out: { path: string; name: string; depth: number }[]) {
  for (const entry of entries) {
    if (entry.is_dir) {
      out.push({ path: entry.path, name: entry.name, depth });
      if (entry.children) collectFolders(entry.children, depth + 1, out);
    }
  }
  return out;
}

interface SidebarProps {
  width: number;
  vaultPath: string | null;
  recentVaults: string[];
  tree: FileEntry[];
  flatFiles: FlatFile[];
  activeFile: string | null;
  selectedFolder: string | null;
  tagIndex: Map<string, FlatFile[]>;
  pinned: string[];
  bookmarks: string[];
  order: Record<string, string[]>;
  onOpenVault: () => void;
  onSwitchVault: (path: string) => void;
  onToggleSidebar: () => void;
  onSelectFile: (path: string) => void;
  onSelectFolder: (path: string) => void;
  onNewNote: () => void;
  onNewFolder: (name: string) => Promise<string | null>;
  onTogglePinned: (path: string) => void;
  onToggleBookmark: (path: string) => void;
  onMove: (sourcePath: string, destinationDir: string) => Promise<string>;
  onDelete: (path: string) => Promise<void>;
  onReorder: (parent: string, paths: string[]) => void;
}

export function Sidebar({
  width,
  vaultPath,
  recentVaults,
  tree,
  flatFiles,
  activeFile,
  selectedFolder,
  tagIndex,
  pinned,
  bookmarks,
  order,
  onOpenVault,
  onSwitchVault,
  onToggleSidebar,
  onSelectFile,
  onSelectFolder,
  onNewNote,
  onNewFolder,
  onTogglePinned,
  onToggleBookmark,
  onMove,
  onDelete,
  onReorder,
}: SidebarProps) {
  const [view, setView] = useState<"files" | "tags" | "bookmarks">("files");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showVaultMenu, setShowVaultMenu] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [moveSource, setMoveSource] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const vaultMenuRef = useRef<HTMLDivElement>(null);

  const otherVaults = recentVaults.filter((p) => p !== vaultPath);

  const showError = (e: unknown) => {
    setActionError(e instanceof Error ? e.message : String(e));
  };

  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(timer);
  }, [actionError]);

  const handleMove = async (source: string, dest: string) => {
    try {
      return await onMove(source, dest);
    } catch (e) {
      showError(e);
      throw e;
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await onDelete(path);
    } catch (e) {
      showError(e);
      throw e;
    }
  };

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
        <button
          type="button"
          className="sidebar-logo-btn"
          onClick={onToggleSidebar}
          title="Hide sidebar (⌘B)"
          aria-label="Hide sidebar"
        >
          <span className="sidebar-logo">dump-it</span>
        </button>
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
                <ChevronDownIcon size={13} />
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
              className="btn-icon-action icon-tooltip keep-folder-selection"
              onClick={() => setShowFolderDialog(true)}
              data-tooltip="New folder"
              aria-label="New folder"
            >
              <FolderPlusIcon size={16} />
            </button>
            <button
              type="button"
              className="btn-icon-action icon-tooltip keep-folder-selection"
              onClick={onNewNote}
              data-tooltip="New note"
              aria-label="New note"
            >
              <FilePlusIcon size={16} />
            </button>
          </div>

          {actionError && (
            <div className="move-error" role="alert">
              {actionError}
              <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error">✕</button>
            </div>
          )}

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
            <button
              type="button"
              className={`sidebar-tab${view === "bookmarks" ? " active" : ""}`}
              onClick={() => setView("bookmarks")}
            >
              Saved{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
            </button>
          </div>

          <div className="sidebar-tree">
            {view === "files" ? (
              <>
                {pinned.length > 0 && (
                  <div className="saved-notes-section">
                    <div className="saved-notes-heading">Pinned</div>
                    {flatFiles.filter((file) => pinned.includes(file.path)).map((file) => (
                      <button key={file.path} type="button" className={`saved-note${activeFile === file.path ? " active" : ""}`} onClick={() => onSelectFile(file.path)}>
                        <span>●</span>{file.name.replace(/\.md$/i, "")}
                      </button>
                    ))}
                  </div>
                )}
                {tree.length === 0 ? (
                  <div className="sidebar-empty-state">
                    <p className="sidebar-empty">No markdown files yet</p>
                    <button type="button" className="btn-primary btn-sm" onClick={onNewNote}>Create first note</button>
                  </div>
                ) : (
                  <FileTree
                    entries={tree}
                    activeFile={activeFile}
                    selectedFolder={selectedFolder}
                    rootPath={vaultPath}
                    order={order}
                    pinned={new Set(pinned)}
                    bookmarks={new Set(bookmarks)}
                    onSelect={onSelectFile}
                    onSelectFolder={onSelectFolder}
                    onRequestMove={setMoveSource}
                    onDelete={handleDelete}
                    onTogglePinned={onTogglePinned}
                    onToggleBookmark={onToggleBookmark}
                    onMove={handleMove}
                    onReorder={onReorder}
                  />
                )}
              </>
            ) : view === "tags" ? (
              <TagList tagIndex={tagIndex} selectedTag={selectedTag} onSelectTag={setSelectedTag} activeFile={activeFile} onSelectFile={onSelectFile} />
            ) : (
              <div className="saved-notes-section bookmark-list">
                {flatFiles.filter((file) => bookmarks.includes(file.path)).map((file) => (
                  <button key={file.path} type="button" className={`saved-note${activeFile === file.path ? " active" : ""}`} onClick={() => onSelectFile(file.path)}>
                    <span>◆</span>{file.name.replace(/\.md$/i, "")}
                  </button>
                ))}
                {bookmarks.length === 0 && <p className="sidebar-empty">No bookmarks yet</p>}
              </div>
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
      {showFolderDialog && (
        <NewFolderDialog
          locationHint={selectedFolder ? basename(selectedFolder) : null}
          onCreate={onNewFolder}
          onClose={() => setShowFolderDialog(false)}
        />
      )}
      {moveSource && (
        <MoveDialog
          sourceName={basename(moveSource)}
          folders={collectFolders(tree, 0, []).filter(
            (f) =>
              f.path !== moveSource &&
              !f.path.startsWith(`${moveSource}/`) &&
              !f.path.startsWith(`${moveSource}\\`),
          )}
          vaultName={vaultPath ? basename(vaultPath) : "Vault"}
          onPick={(dest) => handleMove(moveSource, dest === "__vault_root__" ? (vaultPath ?? "") : dest).then(() => {})}
          onClose={() => setMoveSource(null)}
        />
      )}
    </aside>
  );
}
