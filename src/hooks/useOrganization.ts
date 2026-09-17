import { useCallback, useEffect, useState } from "react";

export interface OrganizationSettings {
  pinned: string[];
  bookmarks: string[];
  order: Record<string, string[]>;
  dailyFolder: string;
  templatesFolder: string;
  dailyTemplate: string;
}

const DEFAULTS: OrganizationSettings = {
  pinned: [],
  bookmarks: [],
  order: {},
  dailyFolder: "Daily",
  templatesFolder: "Templates",
  dailyTemplate: "",
};

function storageKey(vaultPath: string) {
  return `dump-it-organization:${vaultPath}`;
}

function load(vaultPath: string | null): OrganizationSettings {
  if (!vaultPath) return DEFAULTS;
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(vaultPath)) ?? "{}");
    return {
      ...DEFAULTS,
      ...parsed,
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      order: parsed.order && typeof parsed.order === "object" ? parsed.order : {},
    };
  } catch {
    return DEFAULTS;
  }
}

export function useOrganization(vaultPath: string | null) {
  const [settings, setSettings] = useState<OrganizationSettings>(() => load(vaultPath));

  useEffect(() => setSettings(load(vaultPath)), [vaultPath]);

  useEffect(() => {
    if (vaultPath) localStorage.setItem(storageKey(vaultPath), JSON.stringify(settings));
    // Persist only after settings changes. Including vaultPath here would write
    // the previous vault's state before the vault-change effect can load the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const togglePinned = useCallback((path: string) => {
    setSettings((current) => ({
      ...current,
      pinned: current.pinned.includes(path)
        ? current.pinned.filter((item) => item !== path)
        : [...current.pinned, path],
    }));
  }, []);

  const toggleBookmark = useCallback((path: string) => {
    setSettings((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(path)
        ? current.bookmarks.filter((item) => item !== path)
        : [...current.bookmarks, path],
    }));
  }, []);

  const setOrder = useCallback((parent: string, paths: string[]) => {
    setSettings((current) => ({ ...current, order: { ...current.order, [parent]: paths } }));
  }, []);

  const updateSettings = useCallback((patch: Partial<OrganizationSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const remapPath = useCallback((oldPath: string, newPath: string) => {
    const remap = (path: string) =>
      path === oldPath || path.startsWith(`${oldPath}/`) || path.startsWith(`${oldPath}\\`)
        ? newPath + path.slice(oldPath.length)
        : path;
    setSettings((current) => ({
      ...current,
      pinned: current.pinned.map(remap),
      bookmarks: current.bookmarks.map(remap),
      order: Object.fromEntries(
        Object.entries(current.order).map(([parent, paths]) => [remap(parent), paths.map(remap)]),
      ),
    }));
  }, []);

  return { settings, togglePinned, toggleBookmark, setOrder, updateSettings, remapPath };
}
