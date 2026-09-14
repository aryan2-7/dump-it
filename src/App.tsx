import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { Toolbar } from "./components/Toolbar";
import { ResizeHandle } from "./components/ResizeHandle";
import { NewNoteDialog } from "./components/ShortcutManager";
import { SettingsModal } from "./components/SettingsModal";
import { SearchModal } from "./components/SearchModal";
import { useVault } from "./hooks/useVault";
import { useLayout } from "./hooks/useLayout";
import { useShortcuts } from "./hooks/useShortcuts";
import { useTheme } from "./hooks/useTheme";
import { buildTagIndex } from "./utils/tags";
import { findBacklinks } from "./utils/wikiLinks";
import "./App.css";

function App() {
  const splitRef = useRef<HTMLDivElement>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const { theme, setTheme } = useTheme();

  const {
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
    saveNow,
  } = useVault();

  const {
    sidebarWidth,
    setSidebarWidth,
    editorSplitPct,
    setEditorSplitPct,
    previewOpen,
    togglePreview,
    sidebarOpen,
    toggleSidebar,
  } = useLayout();

  const { shortcuts, setShortcuts, resetShortcuts } = useShortcuts({
    togglePreview,
    newNote: () => vaultPath && setShowNewNote(true),
    saveNote: saveNow,
    openVault,
    toggleSidebar,
    openSettings: () => setShowSettings((v) => !v),
    search: () => setShowSearch(true),
    goBack,
    goForward,
  });

  const tagIndex = useMemo(
    () => buildTagIndex(flatFiles, fileContents),
    [flatFiles, fileContents],
  );

  const activeFlatFile = useMemo(
    () => (activeFile ? flatFiles.find((f) => f.path === activeFile) ?? null : null),
    [activeFile, flatFiles],
  );

  const backlinks = useMemo(
    () => findBacklinks(activeFlatFile, flatFiles, fileContents),
    [activeFlatFile, flatFiles, fileContents],
  );

  // Esc closes whichever dialog/modal is open. (The shortcut manager's own
  // key-recording capture-phase listener runs first and stops propagation,
  // so this only fires when it isn't actively recording a binding.)
  useEffect(() => {
    if (!showNewNote && !showSettings && !showSearch) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowNewNote(false);
      setShowSettings(false);
      setShowSearch(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showNewNote, showSettings, showSearch]);

  const handleCreateNote = async (name: string) => {
    setShowNewNote(false);
    await createFile(name);
  };

  const handleOpenSearchResult = async (resultVaultPath: string, filePath: string) => {
    setShowSearch(false);
    if (resultVaultPath !== vaultPath) {
      await switchVault(resultVaultPath);
    }
    await openFile(filePath);
  };

  return (
    <div className="app">
      {sidebarOpen && (
        <>
          <Sidebar
            width={sidebarWidth}
            vaultPath={vaultPath}
            recentVaults={recentVaults}
            tree={tree}
            activeFile={activeFile}
            tagIndex={tagIndex}
            onOpenVault={openVault}
            onSwitchVault={switchVault}
            onSelectFile={openFile}
            onNewNote={() => setShowNewNote(true)}
          />
          <ResizeHandle onResize={(delta) => setSidebarWidth((w) => w + delta)} />
        </>
      )}

      <main className="workspace">
        {loading && <div className="loading-bar" />}

        <Toolbar
          previewOpen={previewOpen}
          shortcuts={shortcuts}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onGoBack={goBack}
          onGoForward={goForward}
          onTogglePreview={togglePreview}
          onNewNote={() => vaultPath && setShowNewNote(true)}
          onOpenSearch={() => setShowSearch(true)}
          onOpenSettings={() => setShowSettings((v) => !v)}
        />

        <div className="split-view" ref={splitRef}>
          <div
            className="editor-pane"
            style={previewOpen ? { width: `${editorSplitPct}%`, flex: "none" } : undefined}
          >
            <MarkdownEditor
              content={content}
              fileName={activeFile}
              isDirty={isDirty}
              onChange={updateContent}
            />
          </div>

          {previewOpen && (
            <>
              <ResizeHandle
                onResize={(delta) => {
                  const width = splitRef.current?.clientWidth ?? 1;
                  setEditorSplitPct((pct) => pct + (delta / width) * 100);
                }}
              />
              <div className="preview-pane">
                <MarkdownPreview
                  content={content}
                  files={flatFiles}
                  backlinks={backlinks}
                  onWikiLinkClick={openFile}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {showNewNote && (
        <NewNoteDialog
          onCreate={handleCreateNote}
          onClose={() => setShowNewNote(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          shortcuts={shortcuts}
          onChangeShortcuts={setShortcuts}
          onResetShortcuts={resetShortcuts}
          theme={theme}
          onChangeTheme={setTheme}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showSearch && (
        <SearchModal
          vaultPath={vaultPath}
          flatFiles={flatFiles}
          fileContents={fileContents}
          recentVaults={recentVaults}
          onOpenResult={handleOpenSearchResult}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

export default App;
