import { useCallback, useState } from "react";

export interface GraphGroup {
  query: string;
  color: string;
}

export interface GraphSettings {
  centerForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
  /** Pull toward the center (d3 forceX/forceY strength) — keeps orphans from drifting away. */
  gravity: number;
  baseRadius: number;
  sizeMultiplier: number;
  linkThickness: number;
  showArrows: boolean;
  labelThreshold: number;
  animate: boolean;
  tagFilter: string;
  existingOnly: boolean;
  hideOrphans: boolean;
  groups: GraphGroup[];
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
  centerForce: 0.3,
  repelForce: 150,
  linkForce: 0.6,
  linkDistance: 90,
  gravity: 0.2,
  baseRadius: 6,
  sizeMultiplier: 3,
  linkThickness: 1,
  showArrows: false,
  labelThreshold: 0.55,
  animate: false,
  tagFilter: "",
  existingOnly: false,
  hideOrphans: false,
  groups: [],
};

const STORAGE_KEY = "dump-it-graph-settings";

function load(): GraphSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GRAPH_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GraphSettings>;
    return { ...DEFAULT_GRAPH_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_GRAPH_SETTINGS;
  }
}

export function useGraphSettings() {
  const [settings, setSettings] = useState<GraphSettings>(load);

  const updateSettings = useCallback((patch: Partial<GraphSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage full or unavailable — settings still apply for this session.
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_GRAPH_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors on reset.
    }
  }, []);

  return { settings, updateSettings, resetSettings };
}
