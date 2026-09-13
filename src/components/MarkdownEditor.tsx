interface MarkdownEditorProps {
  content: string;
  fileName: string | null;
  isDirty: boolean;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ content, fileName, isDirty, onChange }: MarkdownEditorProps) {
  if (!fileName) {
    return (
      <div className="editor-empty">
        <p>Select a note from the sidebar</p>
      </div>
    );
  }

  const label = fileName.split(/[/\\]/).pop()?.replace(/\.md$/i, "") ?? fileName;

  return (
    <div className="editor-pane">
      <div className="pane-header">
        <span className="pane-title">{label}</span>
        {isDirty && <span className="dirty-dot" title="Unsaved changes" />}
      </div>
      <textarea
        className="markdown-editor"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="Start writing..."
      />
    </div>
  );
}
