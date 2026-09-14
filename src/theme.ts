export type ThemeId = "default" | "gruvbox";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  description: string;
  /** Small preview swatch colors, independent of the currently active theme. */
  swatch: { bg: string; accent: string; accent2: string };
}

export const THEMES: ThemeOption[] = [
  {
    id: "default",
    label: "Default",
    description: "The original dump-it dark theme with a purple accent.",
    swatch: { bg: "#1e1e1e", accent: "#7f6df2", accent2: "#e06c75" },
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    description: "Warm Gruvbox dark palette with orange + aqua accents.",
    swatch: { bg: "#282828", accent: "#fe8019", accent2: "#8ec07c" },
  },
];

export const THEME_STORAGE_KEY = "dump-it-theme";

export function isThemeId(value: string | null): value is ThemeId {
  return value === "default" || value === "gruvbox";
}
