import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { FileEntry, FlatFile } from "../types";
import { flattenFiles } from "../utils/wikiLinks";

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

  const openVault = useCallback(async () => {
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
  }, [refreshTree]);

  const openFile = useCallback(async (path: string) => {
    if (path === activeFile && content === savedContent) return;

    if (activeFile && content !== savedContent) {
      await invoke("write_file", { path: activeFile, content });
      setSavedContent(content);
    }

    setLoading(true);
    try {
      const text = await invoke<string>("read_file", { path });
      setActiveFile(path);
      setContent(text);
      setSavedContent(text);
    } finally {
      setLoading(false);
    }
  }, [activeFile, content, savedContent]);

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
    refreshTree,
  };
}
