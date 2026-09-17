import { useEffect, useMemo, useState } from "react";
import type { DragEvent, MouseEvent as ReactMouseEvent } from "react";
import type { FileEntry } from "../types";
import { parentDir } from "../utils/paths";
import { BookmarkIcon, MoveIcon, PinIcon } from "./icons";

interface FileTreeProps {
  entries: FileEntry[];
  activeFile: string | null;
  selectedFolder: string | null;
  rootPath: string;
  order: Record<string, string[]>;
  pinned: Set<string>;
  bookmarks: Set<string>;
  onSelect: (path: string) => void;
  onSelectFolder: (path: string) => void;
  onRequestMove: (path: string) => void;
  onDelete: (path: string) => Promise<void>;
  onTogglePinned: (path: string) => void;
  onToggleBookmark: (path: string) => void;
  onMove: (sourcePath: string, destinationDir: string) => Promise<string>;
  onReorder: (parent: string, paths: string[]) => void;
  depth?: number;
  parentPath?: string;
}

function sortedEntries(entries: FileEntry[], customOrder: string[] | undefined) {
  if (!customOrder) return entries;
  const index = new Map(customOrder.map((path, position) => [path, position]));
  return [...entries].sort((a, b) => {
    const aIndex = index.get(a.path);
    const bIndex = index.get(b.path);
    if (aIndex === undefined && bIndex === undefined) return 0;
    if (aIndex === undefined) return 1;
    if (bIndex === undefined) return -1;
    return aIndex - bIndex;
  });
}

function dragPath(event: DragEvent) {
  // Prefer the dataTransfer payload, but fall back to the in-memory drag
  // state — custom MIME payloads are unreliable in some webviews (Tauri's
  // WKWebView included), while dragstart/drop always fire in the same document.
  return event.dataTransfer.getData("text/x-dump-it-path") || activeDragPath || "";
}

// In-memory record of what's being dragged. Set on dragstart, cleared on
// drop/dragend. Works even when the webview drops the dataTransfer payload.
let activeDragPath: string | null = null;

function EmptyFolderHint({ parentPath, onMove }: { parentPath: string; onMove: (sourcePath: string, destinationDir: string) => Promise<string> }) {
  const [dropTarget, setDropTarget] = useState(false);
  return (
    <div
      className={`tree-empty-folder${dropTarget ? " drop-target" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(true);
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDropTarget(false);
        const source = dragPath(event);
        activeDragPath = null;
        if (!source || parentDir(source) === parentPath) return;
        try {
          await onMove(source, parentPath);
        } catch {
          // Move failures are surfaced by the sidebar's error banner.
        }
      }}
    >
      Drop notes here
    </div>
  );
}

function TreeNode({
  entry,
  siblings,
  props,
  depth,
  parentPath,
}: {
  entry: FileEntry;
  siblings: FileEntry[];
  props: FileTreeProps;
  depth: number;
  parentPath: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [dropTarget, setDropTarget] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; confirm: boolean } | null>(null);
  const isPinned = props.pinned.has(entry.path);
  const isBookmarked = props.bookmarks.has(entry.path);
  const displayName = entry.name.replace(/\.md$/i, "");

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  const openMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, confirm: false });
  };

  const startDrag = (event: DragEvent) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/x-dump-it-path", entry.path);
    activeDragPath = entry.path;
  };

  const endDrag = () => {
    activeDragPath = null;
    setDropTarget(false);
  };

  const drop = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(false);
    const source = dragPath(event);
    activeDragPath = null;
    if (!source || source === entry.path) return;
    try {
      if (entry.is_dir) {
        if (entry.path.startsWith(`${source}/`) || entry.path.startsWith(`${source}\\`)) return;
        await props.onMove(source, entry.path);
        setExpanded(true);
        return;
      }
      const sourceParent = parentDir(source);
      if (sourceParent !== parentPath) {
        await props.onMove(source, parentPath);
        return;
      }
      const paths = siblings.map((item) => item.path).filter((path) => path !== source);
      paths.splice(paths.indexOf(entry.path), 0, source);
      props.onReorder(parentPath, paths);
    } catch {
      // Move failures are surfaced by the sidebar's error banner.
    }
  };

  return (
    <div className={`tree-node${dropTarget ? " drop-target" : ""}`}>
      <div
        className="tree-row"
        draggable
        onDragStart={startDrag}
        onDragEnd={endDrag}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          setDropTarget((prev) => (prev ? prev : true));
        }}
        onDragLeave={() => setDropTarget(false)}
        onDrop={drop}
        onContextMenu={openMenu}
      >
        <button
          type="button"
          className={`tree-item ${entry.is_dir ? "tree-folder-label" : "tree-file"}${props.activeFile === entry.path ? " active" : ""}${entry.is_dir && props.selectedFolder === entry.path ? " folder-selected" : ""}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (entry.is_dir) {
              setExpanded((value) => !value);
              props.onSelectFolder(entry.path);
            } else {
              props.onSelect(entry.path);
            }
          }}
        >
          <span className={`tree-icon${entry.is_dir ? "" : " tree-icon-file"}`}>
            {entry.is_dir ? (expanded ? "▾" : "▸") : "◈"}
          </span>
          <span className="tree-label">{entry.name.replace(/\.md$/i, "")}</span>
          {!entry.is_dir && isPinned && (
            <span className="tree-marker is-on" title="Pinned">
              <PinIcon size={10} />
            </span>
          )}
          {!entry.is_dir && isBookmarked && (
            <span className="tree-marker is-on" title="Bookmarked">
              <BookmarkIcon size={10} />
            </span>
          )}
        </button>
        <div className="tree-actions">
          <button
            type="button"
            className="icon-tooltip"
            onClick={() => props.onRequestMove(entry.path)}
            data-tooltip="Move to folder…"
            aria-label={`Move ${entry.name} to another folder`}
          >
            <MoveIcon size={12} />
          </button>
          {!entry.is_dir && (
            <>
              <button
                type="button"
                className={`icon-tooltip${isPinned ? " is-on" : ""}`}
                onClick={() => props.onTogglePinned(entry.path)}
                data-tooltip={isPinned ? "Unpin" : "Pin to top"}
                aria-label={isPinned ? "Unpin note" : "Pin note"}
              >
                <PinIcon size={12} />
              </button>
              <button
                type="button"
                className={`icon-tooltip${isBookmarked ? " is-on" : ""}`}
                onClick={() => props.onToggleBookmark(entry.path)}
                data-tooltip={isBookmarked ? "Remove bookmark" : "Bookmark"}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark note"}
              >
                <BookmarkIcon size={12} />
              </button>
            </>
          )}
        </div>
      </div>
      {menu && (
        <div
          className="context-menu"
          style={{ left: menu.x, top: menu.y, position: "fixed" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!menu.confirm ? (
            <>
              <div className="context-menu-title">{displayName}</div>
              {!entry.is_dir && (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    props.onSelect(entry.path);
                  }}
                >
                  Open
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenu(null);
                  props.onRequestMove(entry.path);
                }}
              >
                Move to…
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => setMenu({ ...menu, confirm: true })}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <div className="context-menu-title">Delete “{displayName}”?</div>
              <p className="context-menu-note">This cannot be undone.</p>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  void props.onDelete(entry.path).finally(() => setMenu(null));
                }}
              >
                Delete permanently
              </button>
              <button type="button" onClick={() => setMenu(null)}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}
      {entry.is_dir && expanded && (
        <FileTree
          {...props}
          entries={entry.children ?? []}
          depth={depth + 1}
          parentPath={entry.path}
        />
      )}
    </div>
  );
}

export function FileTree(props: FileTreeProps) {
  const depth = props.depth ?? 0;
  const parentPath = props.parentPath ?? props.rootPath;
  const entries = useMemo(
    () => sortedEntries(props.entries, props.order[parentPath]),
    [props.entries, props.order, parentPath],
  );

  return (
    <div
      className="file-tree"
      onDragOver={(event) => event.preventDefault()}
      onDrop={async (event) => {
        if (event.target !== event.currentTarget) return;
        const source = dragPath(event);
        activeDragPath = null;
        if (!source || parentDir(source) === parentPath) return;
        try {
          await props.onMove(source, parentPath);
        } catch {
          // Move failures are surfaced by the sidebar's error banner.
        }
      }}
    >
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          siblings={entries}
          props={props}
          depth={depth}
          parentPath={parentPath}
        />
      ))}
      {entries.length === 0 && depth > 0 && <EmptyFolderHint parentPath={parentPath} onMove={props.onMove} />}
    </div>
  );
}
