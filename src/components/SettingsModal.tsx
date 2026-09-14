import { useState } from "react";
import { KeyboardShortcutsPanel } from "./ShortcutManager";
import { ThemePicker } from "./ThemePicker";
import { KeyboardIcon, PaletteIcon } from "./icons";
import type { ShortcutMap } from "../shortcuts/types";
import type { ThemeId } from "../theme";

type SettingsTab = "keyboard" | "themes";

interface SettingsModalProps {
  shortcuts: ShortcutMap;
  onChangeShortcuts: (shortcuts: ShortcutMap) => void;
  onResetShortcuts: () => void;
  theme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
  onClose: () => void;
}

export function SettingsModal({
  shortcuts,
  onChangeShortcuts,
  onResetShortcuts,
  theme,
  onChangeTheme,
  onClose,
}: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>("keyboard");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-nav">
            <button
              type="button"
              className={`settings-nav-item${tab === "keyboard" ? " active" : ""}`}
              onClick={() => setTab("keyboard")}
            >
              <KeyboardIcon size={14} />
              Keyboard
            </button>
            <button
              type="button"
              className={`settings-nav-item${tab === "themes" ? " active" : ""}`}
              onClick={() => setTab("themes")}
            >
              <PaletteIcon size={14} />
              Themes
            </button>
          </div>

          <div className="settings-content">
            {tab === "keyboard" ? (
              <KeyboardShortcutsPanel
                shortcuts={shortcuts}
                onChange={onChangeShortcuts}
                onReset={onResetShortcuts}
              />
            ) : (
              <ThemePicker theme={theme} onChange={onChangeTheme} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
