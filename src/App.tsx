import { useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { Toolbar } from "./components/Toolbar";
import { ResizeHandle } from "./components/ResizeHandle";
import { NewNoteDialog, ShortcutManager } from "./components/ShortcutManager";
import { useVault } from "./hooks/useVault";
import { useLayout } from "./hooks/useLayout";
import { useShortcuts } from "./hooks/useShortcuts";
import "./App.css";

function App() {
  const splitRef = useRef<HTMLDivElement>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const {
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
  });

  const handleCreateNote = async (name: string) => {
    setShowNewNote(false);
    await createFile(name);
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
    </div>
  );
}

export default App;
