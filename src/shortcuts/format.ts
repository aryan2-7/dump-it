import type { ShortcutBinding } from "./types";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function formatShortcut(binding: ShortcutBinding): string {
  const parts: string[] = [];
  if (binding.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (binding.shift) parts.push(isMac ? "⇧" : "Shift");
  if (binding.alt) parts.push(isMac ? "⌥" : "Alt");
  parts.push(displayKey(binding.key));
  return parts.join(isMac ? " " : "+");
}

function displayKey(key: string): string {
  const special: Record<string, string> = {
    ",": ",",
    ".": ".",
    "/": "/",
    " ": "Space",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };
  const lower = key.toLowerCase();
  return special[lower] ?? special[key] ?? key.toUpperCase();
}

export function bindingFromEvent(e: KeyboardEvent): ShortcutBinding | null {
  if (e.key === "Escape" || e.key === "Tab") return null;
  if (["Control", "Meta", "Shift", "Alt"].includes(e.key)) return null;

  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (!mod && !e.altKey) return null;

  return {
    key: normalizeKey(e.key),
    mod,
    shift: e.shiftKey,
    alt: e.altKey,
  };
}

export function normalizeKey(key: string): string {
  if (key.length === 1) return key.toLowerCase();
  return key.toLowerCase();
}

export function matchesShortcut(e: KeyboardEvent, binding: ShortcutBinding): boolean {
  const mod = isMac ? e.metaKey : e.ctrlKey;
  return (
    mod === binding.mod &&
    e.shiftKey === binding.shift &&
    e.altKey === binding.alt &&
    normalizeKey(e.key) === normalizeKey(binding.key)
  );
}

export function bindingConflict(
  target: ShortcutBinding,
  shortcuts: Record<string, ShortcutBinding>,
  excludeId?: string,
): string | null {
  for (const [id, binding] of Object.entries(shortcuts)) {
    if (excludeId && id === excludeId) continue;
    if (
      binding.key === target.key &&
      binding.mod === target.mod &&
      binding.shift === target.shift &&
      binding.alt === target.alt
    ) {
      return id;
    }
  }
  return null;
}
