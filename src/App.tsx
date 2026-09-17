import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { Toolbar } from "./components/Toolbar";
import { ResizeHandle } from "./components/ResizeHandle";
import { NewNoteDialog } from "./components/ShortcutManager";
import { SettingsModal } from "./components/SettingsModal";
import { SearchModal } from "./components/SearchModal";
import { GraphView } from "./components/GraphView";
import { useVault } from "./hooks/useVault";
import { useOrganization } from "./hooks/useOrganization";
import { useLayout } from "./hooks/useLayout";
import { useShortcuts } from "./hooks/useShortcuts";
import { useTheme } from "./hooks/useTheme";
import { buildTagIndex } from "./utils/tags";
import { findBacklinks } from "./utils/wikiLinks";
import { useGraphData } from "./hooks/useGraph";
import { useGraphSettings } from "./hooks/useGraphSettings";
import { ChevronRightIcon } from "./components/icons";
import { joinPath, basename } from "./utils/paths";
import "./App.css";

function App() {
  const splitRef = useRef<HTMLDivElement>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  // Folder explicitly selected in the tree — new notes are created inside it.
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

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
    createFolder,
    moveEntry,
    deleteEntry,
    openDailyNote,
    saveNow,
  } = useVault();

  const {
    sidebarWidth,
    setSidebarWidth,
    editorSplitPct,
    setEditorSplitPct,
    previewOpen,
    togglePreview,
    editorOpen,
    toggleEditor,
    sidebarOpen,
    toggleSidebar,
  } = useLayout();

  const {
    settings: organization,
    togglePinned,
    toggleBookmark,
    setOrder,
    updateSettings: updateOrganization,
    remapPath,
  } = useOrganization(vaultPath);

  const templates = useMemo(() => {
    if (!vaultPath || !organization.templatesFolder.trim()) return [];
    const folder = joinPath(vaultPath, organization.templatesFolder.trim());
    return flatFiles.filter((file) => file.path.startsWith(`${folder}/`) || file.path.startsWith(`${folder}\\`));
  }, [vaultPath, organization.templatesFolder, flatFiles]);

  const handleDailyNote = async () => {
    setGraphOpen(false);
    await openDailyNote(organization.dailyFolder, organization.dailyTemplate || undefined);
  };

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
    toggleGraph: () => setGraphOpen((value) => !value),
    openDailyNote: () => void handleDailyNote(),
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

  const graph = useGraphData(vaultPath, flatFiles, fileContents);
  const {
    settings: graphSettings,
    updateSettings: updateGraphSettings,
    resetSettings: resetGraphSettings,
  } = useGraphSettings();

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

  const handleCreateNote = async (name: string, templatePath?: string) => {
    setShowNewNote(false);
    setGraphOpen(false);
    await createFile(name, selectedFolder ?? undefined, templatePath ? fileContents[templatePath] : undefined);
  };

  // Selecting a file clears any explicit folder selection — last click wins.
  const handleSelectFile = async (path: string) => {
    setSelectedFolder(null);
    setGraphOpen(false);
    await openFile(path);
  };

  // Folder selection never survives a vault switch.
  useEffect(() => {
    setSelectedFolder(null);
  }, [vaultPath]);

  // Clicking anywhere outside a tree row clears an explicit folder
  // selection — except the sidebar new-file / new-folder buttons (which act
  // on the selected folder) and anything inside a modal. Tree rows manage
  // the selection themselves via click.
  useEffect(() => {
    if (!selectedFolder) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!el || typeof el.closest !== "function") {
        setSelectedFolder(null);
        return;
      }
      if (el.closest(".tree-row, .modal-overlay, .keep-folder-selection")) return;
      setSelectedFolder(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [selectedFolder]);

  const handleMove = async (sourcePath: string, destinationDir: string) => {
    const movedPath = await moveEntry(sourcePath, destinationDir);
    if (movedPath !== sourcePath) {
      remapPath(sourcePath, movedPath);
      setSelectedFolder((prev) =>
        prev === sourcePath || prev?.startsWith(`${sourcePath}/`) || prev?.startsWith(`${sourcePath}\\`)
          ? movedPath + prev.slice(sourcePath.length)
          : prev,
      );
    }
    return movedPath;
  };

  const handleDelete = async (path: string) => {
    await deleteEntry(path);
    setSelectedFolder((prev) =>
      prev === null || prev === path || prev.startsWith(`${path}/`) || prev.startsWith(`${path}\\`)
        ? null
        : prev,
    );
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
      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-ribbon"
          onClick={toggleSidebar}
          title="Show sidebar (⌘B)"
          aria-label="Show sidebar"
        >
          <ChevronRightIcon size={12} />
        </button>
      )}
      {sidebarOpen && (
        <>
          <Sidebar
            width={sidebarWidth}
            vaultPath={vaultPath}
            recentVaults={recentVaults}
            tree={tree}
            flatFiles={flatFiles}
            activeFile={activeFile}
            selectedFolder={selectedFolder}
            tagIndex={tagIndex}
            pinned={organization.pinned}
            bookmarks={organization.bookmarks}
            order={organization.order}
            onOpenVault={openVault}
            onSwitchVault={switchVault}
            onToggleSidebar={toggleSidebar}
            onSelectFile={(path) => void handleSelectFile(path)}
            onSelectFolder={setSelectedFolder}
            onNewNote={() => setShowNewNote(true)}
            onNewFolder={(name) => createFolder(name, selectedFolder ?? undefined)}
            onTogglePinned={togglePinned}
            onToggleBookmark={toggleBookmark}
            onMove={handleMove}
            onDelete={handleDelete}
            onReorder={setOrder}
          />
          <ResizeHandle onResize={(delta) => setSidebarWidth((w) => w + delta)} />
        </>
      )}

      <main className="workspace">
        {loading && <div className="loading-bar" />}

        <Toolbar
          previewOpen={previewOpen}
          editorOpen={editorOpen}
          graphOpen={graphOpen}
          shortcuts={shortcuts}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onGoBack={goBack}
          onGoForward={goForward}
          onTogglePreview={togglePreview}
          onToggleEditor={toggleEditor}
          onToggleGraph={() => setGraphOpen((value) => !value)}
          onOpenDailyNote={() => void handleDailyNote()}
          onOpenSearch={() => setShowSearch(true)}
          onOpenSettings={() => setShowSettings((v) => !v)}
        />

        {graphOpen ? (
          <GraphView
            data={graph}
            settings={graphSettings}
            activeFile={activeFile}
            onSelectFile={(path) => void handleSelectFile(path)}
          />
        ) : (
        <div className="split-view" ref={splitRef}>
          {editorOpen && (
          <div
            className="editor-pane"
            style={editorOpen && previewOpen ? { width: `${editorSplitPct}%`, flex: "none" } : undefined}
          >
            <MarkdownEditor
              content={content}
              fileName={activeFile}
              isDirty={isDirty}
              onChange={updateContent}
            />
          </div>
          )}

          {editorOpen && previewOpen && (
              <ResizeHandle
                onResize={(delta) => {
                  const width = splitRef.current?.clientWidth ?? 1;
                  setEditorSplitPct((pct) => pct + (delta / width) * 100);
                }}
              />
          )}
          {previewOpen && (
              <div className="preview-pane">
                <MarkdownPreview
                  content={content}
                  files={flatFiles}
                  backlinks={backlinks}
                  onWikiLinkClick={openFile}
                />
              </div>
          )}
        </div>
        )}
      </main>

      {showNewNote && (
        <NewNoteDialog
          templates={templates}
          locationHint={selectedFolder ? basename(selectedFolder) : null}
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
          organization={organization}
          templates={templates}
          onChangeOrganization={updateOrganization}
          graphSettings={graphSettings}
          onChangeGraphSettings={updateGraphSettings}
          onResetGraphSettings={resetGraphSettings}
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
