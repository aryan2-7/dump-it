import { formatShortcut } from "../shortcuts/format";
import type { ShortcutMap } from "../shortcuts/types";
import { SettingsIcon } from "./icons";

interface ToolbarProps {
  previewOpen: boolean;
  shortcuts: ShortcutMap;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onTogglePreview: () => void;
  onNewNote: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

export function Toolbar({
  previewOpen,
  shortcuts,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onTogglePreview,
  onNewNote,
  onOpenSearch,
  onOpenSettings,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button
        type="button"
        className="toolbar-btn toolbar-btn-icon"
        onClick={onGoBack}
        disabled={!canGoBack}
        title={`Back (${formatShortcut(shortcuts.goBack)})`}
        aria-label="Go back"
      >
        ←
      </button>
      <button
        type="button"
        className="toolbar-btn toolbar-btn-icon"
        onClick={onGoForward}
        disabled={!canGoForward}
        title={`Forward (${formatShortcut(shortcuts.goForward)})`}
        aria-label="Go forward"
      >
        →
      </button>
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
      <button
        type="button"
        className="toolbar-btn"
        onClick={onOpenSearch}
        title={`Search (${formatShortcut(shortcuts.search)})`}
      >
        Search
      </button>
      <div className="toolbar-spacer" />
      <button
        type="button"
        className="toolbar-btn toolbar-btn-icon icon-tooltip"
        onClick={onOpenSettings}
        data-tooltip={`Settings (${formatShortcut(shortcuts.openSettings)})`}
        aria-label="Settings"
      >
        <SettingsIcon />
      </button>
    </div>
  );
}
