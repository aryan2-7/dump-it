import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SHORTCUTS, SHORTCUTS_STORAGE_KEY } from "../shortcuts/defaults";
import { matchesShortcut } from "../shortcuts/format";
import type { ActionId, ShortcutMap } from "../shortcuts/types";

function loadShortcuts(): ShortcutMap {
  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SHORTCUTS };
    return { ...DEFAULT_SHORTCUTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SHORTCUTS };
  }
}

export function useShortcuts(actions: Partial<Record<ActionId, () => void>>) {
  const [shortcuts, setShortcutsState] = useState<ShortcutMap>(loadShortcuts);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const setShortcuts = useCallback((next: ShortcutMap) => {
    setShortcutsState(next);
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetShortcuts = useCallback(() => {
    const defaults = { ...DEFAULT_SHORTCUTS };
    setShortcuts(defaults);
    return defaults;
  }, [setShortcuts]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const [id, binding] of Object.entries(shortcuts) as [ActionId, ShortcutMap[ActionId]][]) {
        if (!matchesShortcut(e, binding)) continue;

        const action = actionsRef.current[id];
        if (!action) continue;

        if (isEditable && id !== "saveNote" && id !== "togglePreview" && id !== "search") continue;

        e.preventDefault();
        action();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);

  return { shortcuts, setShortcuts, resetShortcuts };
}
