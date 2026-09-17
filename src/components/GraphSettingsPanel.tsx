import { useState } from "react";
import type { GraphSettings } from "../hooks/useGraphSettings";
import { DEFAULT_GRAPH_SETTINGS } from "../hooks/useGraphSettings";

interface StepperProps {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  onChange: (value: number) => void;
}

function Stepper({ label, value, step, min, max, decimals = 2, onChange }: StepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  const display = decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
  return (
    <div className="graph-setting-row">
      <span className="graph-setting-label">{label}</span>
      <div className="stepper" role="group" aria-label={label}>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="stepper-value" aria-live="polite">{display}</span>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface GraphSettingsPanelProps {
  settings: GraphSettings;
  onChange: (patch: Partial<GraphSettings>) => void;
  onReset: () => void;
}

export function GraphSettingsPanel({ settings, onChange, onReset }: GraphSettingsPanelProps) {
  const [groupQuery, setGroupQuery] = useState("");
  const [groupColor, setGroupColor] = useState("#eab308");

  const addGroup = () => {
    const q = groupQuery.trim();
    if (!q) return;
    onChange({ groups: [...settings.groups, { query: q, color: groupColor }] });
    setGroupQuery("");
  };

  const isDefault = JSON.stringify({ ...settings }) === JSON.stringify(DEFAULT_GRAPH_SETTINGS);

  return (
    <div className="settings-panel graph-settings">
      <div className="settings-panel-header">
        <h3>Graph view</h3>
        <button type="button" className="btn-ghost btn-sm" onClick={onReset} disabled={isDefault}>
          Reset defaults
        </button>
      </div>
      <p className="modal-hint">Physics and appearance for the note graph. Changes apply live.</p>

      <h4 className="graph-settings-heading">Physics</h4>
      <Stepper label="Center force" value={settings.centerForce} step={0.05} min={0} max={1} onChange={(v) => onChange({ centerForce: v })} />
      <Stepper label="Repel force" value={settings.repelForce} step={10} min={0} max={800} decimals={0} onChange={(v) => onChange({ repelForce: v })} />
      <Stepper label="Link force" value={settings.linkForce} step={0.05} min={0} max={2} onChange={(v) => onChange({ linkForce: v })} />
      <Stepper label="Link distance" value={settings.linkDistance} step={5} min={20} max={300} decimals={0} onChange={(v) => onChange({ linkDistance: v })} />
      <Stepper label="Gravity" value={settings.gravity} step={0.05} min={0} max={1} onChange={(v) => onChange({ gravity: v })} />
      <p className="graph-settings-note">Gravity pulls every node toward the center so unlinked notes drift instead of flying off.</p>

      <h4 className="graph-settings-heading">Appearance</h4>
      <Stepper label="Node size" value={settings.baseRadius} step={1} min={2} max={14} decimals={0} onChange={(v) => onChange({ baseRadius: v })} />
      <Stepper label="Size × links" value={settings.sizeMultiplier} step={0.5} min={0} max={10} decimals={1} onChange={(v) => onChange({ sizeMultiplier: v })} />
      <Stepper label="Link width" value={settings.linkThickness} step={0.5} min={0.5} max={5} decimals={1} onChange={(v) => onChange({ linkThickness: v })} />
      <Stepper label="Label zoom" value={settings.labelThreshold} step={0.05} min={0.1} max={2} onChange={(v) => onChange({ labelThreshold: v })} />
      <label className="graph-toggle">
        <button
          type="button"
          role="switch"
          aria-checked={settings.showArrows}
          aria-label="Show arrows"
          className={`switch${settings.showArrows ? " on" : ""}`}
          onClick={() => onChange({ showArrows: !settings.showArrows })}
        >
          <span className="switch-knob" />
        </button>
        Arrows
      </label>
      <label className="graph-toggle">
        <button
          type="button"
          role="switch"
          aria-checked={settings.animate}
          aria-label="Animate reveal"
          className={`switch${settings.animate ? " on" : ""}`}
          onClick={() => onChange({ animate: !settings.animate })}
        >
          <span className="switch-knob" />
        </button>
        Animate reveal
      </label>

      <h4 className="graph-settings-heading">Filters</h4>
      <label className="field-label" htmlFor="graph-tag-filter">Tag contains</label>
      <input
        id="graph-tag-filter"
        className="field-input"
        value={settings.tagFilter}
        onChange={(e) => onChange({ tagFilter: e.target.value })}
        placeholder="e.g. project"
      />
      <label className="graph-toggle">
        <button
          type="button"
          role="switch"
          aria-checked={settings.existingOnly}
          aria-label="Existing files only"
          className={`switch${settings.existingOnly ? " on" : ""}`}
          onClick={() => onChange({ existingOnly: !settings.existingOnly })}
        >
          <span className="switch-knob" />
        </button>
        Existing files only
      </label>
      <label className="graph-toggle">
        <button
          type="button"
          role="switch"
          aria-checked={settings.hideOrphans}
          aria-label="Hide orphans"
          className={`switch${settings.hideOrphans ? " on" : ""}`}
          onClick={() => onChange({ hideOrphans: !settings.hideOrphans })}
        >
          <span className="switch-knob" />
        </button>
        Hide orphans
      </label>

      <h4 className="graph-settings-heading">Groups</h4>
      <p className="graph-settings-note">Color notes matching a query. Later groups override earlier ones.</p>
      <div className="group-add">
        <input
          value={groupQuery}
          onChange={(e) => setGroupQuery(e.target.value)}
          placeholder="query…"
          aria-label="Group query"
          onKeyDown={(e) => {
            if (e.key === "Enter") addGroup();
          }}
        />
        <input type="color" value={groupColor} onChange={(e) => setGroupColor(e.target.value)} aria-label="Group color" />
        <button type="button" className="btn-ghost btn-sm" onClick={addGroup} disabled={!groupQuery.trim()}>
          Add
        </button>
      </div>
      {settings.groups.map((g, i) => (
        <div key={`${g.query}-${i}`} className="group-row">
          <span className="group-dot" style={{ background: g.color }} />
          <span className="group-query">{g.query}</span>
          <button
            type="button"
            className="btn-ghost btn-sm"
            aria-label={`Remove group ${g.query}`}
            onClick={() => onChange({ groups: settings.groups.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      {settings.groups.length === 0 && <p className="graph-settings-note">No groups yet.</p>}
    </div>
  );
}
