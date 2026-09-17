import { useState } from "react";
import { KeyboardShortcutsPanel } from "./ShortcutManager";
import { ThemePicker } from "./ThemePicker";
import { GraphSettingsPanel } from "./GraphSettingsPanel";
import { CalendarIcon, GraphIcon, KeyboardIcon, PaletteIcon } from "./icons";
import type { ShortcutMap } from "../shortcuts/types";
import type { ThemeId } from "../theme";
import type { FlatFile } from "../types";
import type { OrganizationSettings } from "../hooks/useOrganization";
import type { GraphSettings } from "../hooks/useGraphSettings";

type SettingsTab = "keyboard" | "themes" | "daily" | "graph";

interface SettingsModalProps {
  shortcuts: ShortcutMap;
  onChangeShortcuts: (shortcuts: ShortcutMap) => void;
  onResetShortcuts: () => void;
  theme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
  organization: OrganizationSettings;
  templates: FlatFile[];
  onChangeOrganization: (patch: Partial<OrganizationSettings>) => void;
  graphSettings: GraphSettings;
  onChangeGraphSettings: (patch: Partial<GraphSettings>) => void;
  onResetGraphSettings: () => void;
  onClose: () => void;
}

export function SettingsModal({
  shortcuts,
  onChangeShortcuts,
  onResetShortcuts,
  theme,
  onChangeTheme,
  organization,
  templates,
  onChangeOrganization,
  graphSettings,
  onChangeGraphSettings,
  onResetGraphSettings,
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
            <button
              type="button"
              className={`settings-nav-item${tab === "daily" ? " active" : ""}`}
              onClick={() => setTab("daily")}
            >
              <CalendarIcon size={14} />
              Daily notes
            </button>
            <button
              type="button"
              className={`settings-nav-item${tab === "graph" ? " active" : ""}`}
              onClick={() => setTab("graph")}
            >
              <GraphIcon size={14} />
              Graph
            </button>
          </div>

          <div className="settings-content">
            {tab === "keyboard" ? (
              <KeyboardShortcutsPanel shortcuts={shortcuts} onChange={onChangeShortcuts} onReset={onResetShortcuts} />
            ) : tab === "themes" ? (
              <ThemePicker theme={theme} onChange={onChangeTheme} />
            ) : tab === "graph" ? (
              <GraphSettingsPanel settings={graphSettings} onChange={onChangeGraphSettings} onReset={onResetGraphSettings} />
            ) : (
              <div className="settings-panel daily-settings">
                <div className="settings-panel-header"><h3>Daily notes & templates</h3></div>
                <p className="modal-hint">Templates are markdown files in the templates folder. Supported variables: <code>{"{{date}}"}</code>, <code>{"{{time}}"}</code>, and <code>{"{{title}}"}</code>.</p>
                <label className="field-label" htmlFor="daily-folder">Daily notes folder</label>
                <input id="daily-folder" className="field-input" value={organization.dailyFolder} onChange={(event) => onChangeOrganization({ dailyFolder: event.target.value })} placeholder="Daily" />
                <label className="field-label" htmlFor="templates-folder">Templates folder</label>
                <input id="templates-folder" className="field-input" value={organization.templatesFolder} onChange={(event) => onChangeOrganization({ templatesFolder: event.target.value })} placeholder="Templates" />
                <label className="field-label" htmlFor="daily-template">Daily note template</label>
                <select id="daily-template" className="field-input" value={organization.dailyTemplate} onChange={(event) => onChangeOrganization({ dailyTemplate: event.target.value })}>
                  <option value="">Default daily note</option>
                  {templates.map((template) => <option key={template.path} value={template.path}>{template.name.replace(/\.md$/i, "")}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
