import { THEMES, type ThemeId } from "../theme";

interface ThemePickerProps {
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
}

export function ThemePicker({ theme, onChange }: ThemePickerProps) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h3>Theme</h3>
      </div>

      <p className="modal-hint">Pick the color theme for the whole app.</p>

      <div className="theme-grid">
        {THEMES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`theme-option${theme === option.id ? " active" : ""}`}
            onClick={() => onChange(option.id)}
          >
            <span
              className="theme-swatch"
              style={{ background: option.swatch.bg }}
            >
              <span
                className="theme-swatch-dot"
                style={{ background: option.swatch.accent }}
              />
              <span
                className="theme-swatch-dot"
                style={{ background: option.swatch.accent2 }}
              />
            </span>
            <span className="theme-option-text">
              <span className="theme-option-label">
                {option.label}
                {option.id === "default" && (
                  <span className="theme-option-default-tag">Default</span>
                )}
              </span>
              <span className="theme-option-desc">{option.description}</span>
            </span>
            {theme === option.id && <span className="theme-option-check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
