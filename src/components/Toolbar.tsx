import { formatShortcut } from "../shortcuts/format";
import type { ShortcutMap } from "../shortcuts/types";
import { SettingsIcon } from "./icons";

interface ToolbarProps {
  previewOpen: boolean;
  editorOpen: boolean;
  graphOpen: boolean;
  shortcuts: ShortcutMap;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onTogglePreview: () => void;
  onToggleEditor: () => void;
  onToggleGraph: () => void;
  onOpenDailyNote: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

export function Toolbar({
  previewOpen,
  editorOpen,
  graphOpen,
  shortcuts,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onTogglePreview,
  onToggleEditor,
  onToggleGraph,
  onOpenDailyNote,
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
      <button type="button" className="toolbar-btn" onClick={onOpenDailyNote} title={`Open today's note (${formatShortcut(shortcuts.openDailyNote)})`}>
        Today
      </button>
      <div className="toolbar-spacer" />
      <button
        type="button"
        className={`toolbar-btn${editorOpen ? " active" : ""}`}
        onClick={onToggleEditor}
        title="Toggle editor pane"
        disabled={graphOpen}
      >
        Editor
      </button>
      <button
        type="button"
        className={`toolbar-btn${previewOpen ? " active" : ""}`}
        onClick={onTogglePreview}
        title={`Toggle preview (${formatShortcut(shortcuts.togglePreview)})`}
        disabled={graphOpen}
      >
        Preview
      </button>
      <button type="button" className={`toolbar-btn${graphOpen ? " active" : ""}`} onClick={onToggleGraph} title={`Toggle graph (${formatShortcut(shortcuts.toggleGraph)})`}>
        Graph
      </button>
      <button
        type="button"
        className="toolbar-btn"
        onClick={onOpenSearch}
        title={`Search (${formatShortcut(shortcuts.search)})`}
      >
        Search
      </button>
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
