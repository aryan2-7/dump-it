import { formatShortcut } from "../shortcuts/format";
import type { ShortcutMap } from "../shortcuts/types";

interface ToolbarProps {
  previewOpen: boolean;
  shortcuts: ShortcutMap;
  onTogglePreview: () => void;
  onNewNote: () => void;
  onOpenShortcuts: () => void;
}

export function Toolbar({
  previewOpen,
  shortcuts,
  onTogglePreview,
  onNewNote,
  onOpenShortcuts,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button
        type="button"
        className={`toolbar-btn${previewOpen ? " active" : ""}`}
        onClick={onTogglePreview}
        title={`Toggle preview (${formatShortcut(shortcuts.togglePreview)})`}
      >
        Preview
      </button>
      <button
        type="button"
        className="toolbar-btn"
        onClick={onNewNote}
        title={`New note (${formatShortcut(shortcuts.newNote)})`}
      >
        + New
      </button>
      <div className="toolbar-spacer" />
      <button
        type="button"
        className="toolbar-btn toolbar-btn-icon"
        onClick={onOpenShortcuts}
        title={`Shortcuts (${formatShortcut(shortcuts.openShortcutManager)})`}
        aria-label="Keyboard shortcuts"
      >
        ⌨
      </button>
    </div>
  );
}
