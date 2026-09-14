import { useEffect, useState } from "react";
import { SHORTCUT_ACTIONS } from "../shortcuts/defaults";
import {
  bindingConflict,
  bindingFromEvent,
  formatShortcut,
} from "../shortcuts/format";
import type { ActionId, ShortcutMap } from "../shortcuts/types";

interface KeyboardShortcutsPanelProps {
  shortcuts: ShortcutMap;
  onChange: (shortcuts: ShortcutMap) => void;
  onReset: () => void;
}

export function KeyboardShortcutsPanel({
  shortcuts,
  onChange,
  onReset,
}: KeyboardShortcutsPanelProps) {
  const [recording, setRecording] = useState<ActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecording(null);
        setError(null);
        return;
      }

      const binding = bindingFromEvent(e);
      if (!binding) return;

      const conflict = bindingConflict(binding, shortcuts, recording);
      if (conflict) {
        const label = SHORTCUT_ACTIONS.find((a) => a.id === conflict)?.label ?? conflict;
        setError(`Already used by "${label}"`);
        return;
      }

      onChange({ ...shortcuts, [recording]: binding });
      setRecording(null);
      setError(null);
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [recording, shortcuts, onChange]);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Keyboard Shortcuts</h3>
        <button type="button" className="btn-ghost btn-sm" onClick={onReset}>
          Reset to defaults
        </button>
      </div>

      <p className="modal-hint">
        Click a shortcut to rebind it. Press Esc to cancel recording.
      </p>

      {error && <p className="modal-error">{error}</p>}

      <div className="shortcut-list">
        {SHORTCUT_ACTIONS.map((action) => {
          const binding = shortcuts[action.id];
          const isRecording = recording === action.id;

          return (
            <div key={action.id} className="shortcut-row">
              <div className="shortcut-info">
                <span className="shortcut-label">{action.label}</span>
                <span className="shortcut-desc">{action.description}</span>
              </div>
              <button
                type="button"
                className={`shortcut-key${isRecording ? " recording" : ""}`}
                onClick={() => {
                  setRecording(action.id);
                  setError(null);
                }}
              >
                {isRecording ? "Press keys…" : formatShortcut(binding)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface NewNoteDialogProps {
  onCreate: (name: string) => void;
  onClose: () => void;
}

export function NewNoteDialog({ onCreate, onClose }: NewNoteDialogProps) {
  const [name, setName] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal new-note-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Note</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="field-label" htmlFor="note-name">
          Note name
        </label>
        <input
          id="note-name"
          className="field-input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Note"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onCreate(name.trim());
            }
            if (e.key === "Escape") onClose();
          }}
        />

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim())}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
