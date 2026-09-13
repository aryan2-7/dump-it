import { useState } from "react";
import type { FileEntry } from "../types";

interface FileTreeProps {
  entries: FileEntry[];
  activeFile: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}

function FileIcon({ isDir, open }: { isDir: boolean; open: boolean }) {
  if (isDir) {
    return <span className="tree-icon">{open ? "▾" : "▸"}</span>;
  }
  return <span className="tree-icon tree-icon-file">◈</span>;
}

function TreeNode({
  entry,
  activeFile,
  onSelect,
  depth,
}: {
  entry: FileEntry;
  activeFile: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (entry.is_dir) {
    return (
      <div className="tree-folder">
        <button
          type="button"
          className="tree-item tree-folder-label"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setExpanded((v) => !v)}
        >
          <FileIcon isDir open={expanded} />
          <span>{entry.name}</span>
        </button>
        {expanded && entry.children && (
          <FileTree
            entries={entry.children}
            activeFile={activeFile}
            onSelect={onSelect}
            depth={depth + 1}
          />
        )}
      </div>
    );
  }

  const label = entry.name.replace(/\.md$/i, "");

  return (
    <button
      type="button"
      className={`tree-item tree-file${activeFile === entry.path ? " active" : ""}`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelect(entry.path)}
    >
      <FileIcon isDir={false} open={false} />
      <span>{label}</span>
    </button>
  );
}

export function FileTree({ entries, activeFile, onSelect, depth = 0 }: FileTreeProps) {
  return (
    <div className="file-tree">
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          activeFile={activeFile}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </div>
  );
}
