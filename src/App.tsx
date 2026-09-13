import { useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { Toolbar } from "./components/Toolbar";
import { ResizeHandle } from "./components/ResizeHandle";
import { NewNoteDialog, ShortcutManager } from "./components/ShortcutManager";
import { SearchModal } from "./components/SearchModal";
import { useVault } from "./hooks/useVault";
import { useLayout } from "./hooks/useLayout";
import { useShortcuts } from "./hooks/useShortcuts";
import { buildTagIndex } from "./utils/tags";
import "./App.css";

function App() {
  const splitRef = useRef<HTMLDivElement>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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
    openVault,
    switchVault,
    openFile,
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
    openShortcutManager: () => setShowShortcuts(true),
    search: () => setShowSearch(true),
  });

  const tagIndex = useMemo(
    () => buildTagIndex(flatFiles, fileContents),
    [flatFiles, fileContents],
  );

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
            tree={tree}
            activeFile={activeFile}
            tagIndex={tagIndex}
            onOpenVault={openVault}
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
          onTogglePreview={togglePreview}
          onNewNote={() => vaultPath && setShowNewNote(true)}
          onOpenSearch={() => setShowSearch(true)}
          onOpenShortcuts={() => setShowShortcuts(true)}
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

      {showShortcuts && (
        <ShortcutManager
          shortcuts={shortcuts}
          onChange={setShortcuts}
          onReset={resetShortcuts}
          onClose={() => setShowShortcuts(false)}
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
