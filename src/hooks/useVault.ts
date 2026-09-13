import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { FileEntry, FlatFile } from "../types";
import { flattenFiles } from "../utils/wikiLinks";
import { joinPath, parentDir, sanitizeFileName } from "../utils/paths";

const VAULT_KEY = "dump-it-vault-path";

export function useVault() {
  const [vaultPath, setVaultPath] = useState<string | null>(() =>
    localStorage.getItem(VAULT_KEY),
  );
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [flatFiles, setFlatFiles] = useState<FlatFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      await refreshTree(selected);
      setActiveFile(null);
      setContent("");
      setSavedContent("");
    } finally {
      setLoading(false);
    }
  }, [flushSave, refreshTree]);

  const openFile = useCallback(
    async (path: string) => {
      if (path === activeFile) return;

      await flushSave();

      setLoading(true);
      try {
        const text = await invoke<string>("read_file", { path });
        setActiveFile(path);
        setContent(text);
        setSavedContent(text);
      } finally {
        setLoading(false);
      }
    },
    [activeFile, flushSave],
  );

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

  return {
    vaultPath,
    tree,
    flatFiles,
    activeFile,
    content,
    loading,
    isDirty,
    openVault,
    openFile,
    updateContent,
    createFile,
    saveNow: flushSave,
    refreshTree,
  };
}
