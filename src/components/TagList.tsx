import type { FlatFile } from "../types";

interface TagListProps {
  tagIndex: Map<string, FlatFile[]>;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

export function TagList({
  tagIndex,
  selectedTag,
  onSelectTag,
  activeFile,
  onSelectFile,
}: TagListProps) {
  if (tagIndex.size === 0) {
    return <p className="sidebar-empty">No tags yet. Add #tags to your notes.</p>;
  }

  if (selectedTag) {
    const files = tagIndex.get(selectedTag) ?? [];
    return (
      <div className="tag-detail">
        <button type="button" className="tag-back" onClick={() => onSelectTag(null)}>
          ← All tags
        </button>
        <div className="tag-detail-title">#{selectedTag}</div>
        <div className="file-tree">
          {files.map((f) => (
            <button
              key={f.path}
              type="button"
              className={`tree-item tree-file${activeFile === f.path ? " active" : ""}`}
              onClick={() => onSelectFile(f.path)}
            >
              <span className="tree-icon tree-icon-file">◈</span>
              <span>{f.name.replace(/\.md$/i, "")}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const tags = Array.from(tagIndex.entries()).sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );

  return (
    <div className="tag-list">
      {tags.map(([tag, files]) => (
        <button
          key={tag}
          type="button"
          className="tag-pill"
          onClick={() => onSelectTag(tag)}
          title={`${files.length} note${files.length === 1 ? "" : "s"}`}
        >
          <span className="tag-hash">#</span>
          {tag}
          <span className="tag-count">{files.length}</span>
        </button>
      ))}
    </div>
  );
}
