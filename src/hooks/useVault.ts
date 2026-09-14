import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { FileEntry, FlatFile } from "../types";
import { flattenFiles } from "../utils/wikiLinks";
import { joinPath, parentDir, sanitizeFileName } from "../utils/paths";

const VAULT_KEY = "dump-it-vault-path";
const RECENT_VAULTS_KEY = "dump-it-recent-vaults";
const MAX_RECENT_VAULTS = 8;

interface NavState {
  stack: string[];
  index: number;
}

function loadRecentVaults(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_VAULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export function useVault() {
  const [vaultPath, setVaultPath] = useState<string | null>(() =>
    localStorage.getItem(VAULT_KEY),
  );
  const [recentVaults, setRecentVaults] = useState<string[]>(loadRecentVaults);
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [flatFiles, setFlatFiles] = useState<FlatFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Back/forward navigation history, similar to a browser. Kept in a ref so
  // reads are always fresh, mirrored into state so the UI can react to it.
  const navRef = useRef<NavState>({ stack: [], index: -1 });
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const syncNavState = useCallback(() => {
    setCanGoBack(navRef.current.index > 0);
    setCanGoForward(navRef.current.index < navRef.current.stack.length - 1);
  }, []);

  const resetNav = useCallback(() => {
    navRef.current = { stack: [], index: -1 };
    syncNavState();
  }, [syncNavState]);

  const addRecentVault = useCallback((path: string) => {
    setRecentVaults((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(0, MAX_RECENT_VAULTS);
      localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshTree = useCallback(async (path: string) => {
    const entries = await invoke<FileEntry[]>("list_vault", { vaultPath: path });
    setTree(entries);
    setFlatFiles(flattenFiles(entries));
  }, []);

  const flushSave = useCallback(async () => {
    if (!activeFile || content === savedContent) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await invoke("write_file", { path: activeFile, content });
    setSavedContent(content);
  }, [activeFile, content, savedContent]);

  const openVault = useCallback(async () => {
    await flushSave();

    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open Vault Folder",
    });
    if (typeof selected !== "string") return;

    setLoading(true);
    try {
      setVaultPath(selected);
      localStorage.setItem(VAULT_KEY, selected);
      addRecentVault(selected);
      await refreshTree(selected);
      setActiveFile(null);
      setContent("");
      setSavedContent("");
      resetNav();
    } finally {
      setLoading(false);
    }
  }, [flushSave, refreshTree, addRecentVault, resetNav]);

  const switchVault = useCallback(
    async (path: string) => {
      if (path === vaultPath) return;
      await flushSave();

      setLoading(true);
      try {
        setVaultPath(path);
        localStorage.setItem(VAULT_KEY, path);
        addRecentVault(path);
        await refreshTree(path);
        setActiveFile(null);
        setContent("");
        setSavedContent("");
        resetNav();
      } finally {
        setLoading(false);
      }
    },
    [vaultPath, flushSave, refreshTree, addRecentVault, resetNav],
  );

  const openFile = useCallback(
    async (path: string, opts?: { skipHistory?: boolean }) => {
      if (path === activeFile) return;

      await flushSave();

      setLoading(true);
      try {
        const text = await invoke<string>("read_file", { path });
        setActiveFile(path);
        setContent(text);
        setSavedContent(text);

        if (!opts?.skipHistory) {
          const { stack, index } = navRef.current;
          const trimmed = stack.slice(0, index + 1);
          trimmed.push(path);
          navRef.current = { stack: trimmed, index: trimmed.length - 1 };
          syncNavState();
        }
      } finally {
        setLoading(false);
      }
    },
    [activeFile, flushSave, syncNavState],
  );

  const goBack = useCallback(async () => {
    const { stack, index } = navRef.current;
    if (index <= 0) return;
    const newIndex = index - 1;
    navRef.current = { stack, index: newIndex };
    syncNavState();
    await openFile(stack[newIndex], { skipHistory: true });
  }, [openFile, syncNavState]);

  const goForward = useCallback(async () => {
    const { stack, index } = navRef.current;
    if (index >= stack.length - 1) return;
    const newIndex = index + 1;
    navRef.current = { stack, index: newIndex };
    syncNavState();
    await openFile(stack[newIndex], { skipHistory: true });
  }, [openFile, syncNavState]);

  const updateContent = useCallback(
    (value: string) => {
      setContent(value);
      if (!activeFile) return;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await invoke("write_file", { path: activeFile, content: value });
        setSavedContent(value);
      }, 800);
    },
    [activeFile],
  );

  const createFile = useCallback(
    async (name: string, folderPath?: string) => {
      if (!vaultPath) return null;

      await flushSave();

      const sanitized = sanitizeFileName(name);
      const dir = folderPath ?? (activeFile ? parentDir(activeFile) : vaultPath);
      const path = joinPath(dir, `${sanitized}.md`);
      const title = sanitized.replace(/-/g, " ");
      const initial = `# ${title}\n\n`;

      setLoading(true);
      try {
        await invoke("create_file", { path, content: initial });
        await refreshTree(vaultPath);
        await openFile(path);
        return path;
      } finally {
        setLoading(false);
      }
    },
    [vaultPath, activeFile, flushSave, refreshTree, openFile],
  );

  const isDirty = content !== savedContent;

  useEffect(() => {
    if (!vaultPath) return;
    refreshTree(vaultPath).catch(() => {
      localStorage.removeItem(VAULT_KEY);
      setVaultPath(null);
    });
  }, [vaultPath, refreshTree]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Keep a content cache for the whole vault, used to power tag parsing and
  // search. Loaded once per vault (files list change) then kept live for
  // whichever file is being edited.
  useEffect(() => {
    if (flatFiles.length === 0) {
      setFileContents({});
      return;
    }

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        flatFiles.map(async (f) => {
          try {
            const text = await invoke<string>("read_file", { path: f.path });
            return [f.path, text] as const;
          } catch {
            return [f.path, ""] as const;
          }
        }),
      );
      if (!cancelled) setFileContents(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [flatFiles]);

  useEffect(() => {
    if (!activeFile) return;
    setFileContents((prev) => {
      if (prev[activeFile] === content) return prev;
      return { ...prev, [activeFile]: content };
    });
  }, [activeFile, content]);

  return {
    vaultPath,
    recentVaults,
    tree,
    flatFiles,
    fileContents,
    activeFile,
    content,
    loading,
    isDirty,
    canGoBack,
    canGoForward,
    openVault,
    switchVault,
    openFile,
    goBack,
    goForward,
    updateContent,
    createFile,
    saveNow: flushSave,
    refreshTree,
  };
}
