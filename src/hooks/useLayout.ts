import { useCallback, useEffect, useState } from "react";

const SIDEBAR_WIDTH_KEY = "dump-it-sidebar-width";
const EDITOR_SPLIT_KEY = "dump-it-editor-split";
const PREVIEW_OPEN_KEY = "dump-it-preview-open";
const SIDEBAR_OPEN_KEY = "dump-it-sidebar-open";

function loadNumber(key: string, fallback: number, min: number, max: number): number {
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : fallback;
  if (Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function loadBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

export function useLayout() {
  const [sidebarWidth, setSidebarWidthState] = useState(() =>
    loadNumber(SIDEBAR_WIDTH_KEY, 260, 180, 480),
  );
  const [editorSplitPct, setEditorSplitPctState] = useState(() =>
    loadNumber(EDITOR_SPLIT_KEY, 55, 25, 75),
  );
  const [previewOpen, setPreviewOpenState] = useState(() => loadBool(PREVIEW_OPEN_KEY, false));
  const [sidebarOpen, setSidebarOpenState] = useState(() => loadBool(SIDEBAR_OPEN_KEY, true));

  const setSidebarWidth = useCallback((value: number | ((prev: number) => number)) => {
    setSidebarWidthState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      const clamped = Math.min(480, Math.max(180, next));
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
      return clamped;
    });
  }, []);

  const setEditorSplitPct = useCallback((value: number | ((prev: number) => number)) => {
    setEditorSplitPctState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      const clamped = Math.min(75, Math.max(25, next));
      localStorage.setItem(EDITOR_SPLIT_KEY, String(clamped));
      return clamped;
    });
  }, []);

  const setPreviewOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setPreviewOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      localStorage.setItem(PREVIEW_OPEN_KEY, String(next));
      return next;
    });
  }, []);

  const togglePreview = useCallback(() => {
    setPreviewOpen((v) => !v);
  }, [setPreviewOpen]);

  const setSidebarOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setSidebarOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(next));
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, [setSidebarOpen]);

  useEffect(() => {
    const onMouseUp = () => document.body.classList.remove("is-resizing");
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  return {
    sidebarWidth,
    setSidebarWidth,
    editorSplitPct,
    setEditorSplitPct,
    previewOpen,
    setPreviewOpen,
    togglePreview,
    sidebarOpen,
    toggleSidebar,
  };
}
