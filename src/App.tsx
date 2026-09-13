import { Sidebar } from "./components/Sidebar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { useVault } from "./hooks/useVault";
import "./App.css";

function App() {
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
  } = useVault();

  return (
    <div className="app">
      <Sidebar
        vaultPath={vaultPath}
        tree={tree}
        activeFile={activeFile}
        onOpenVault={openVault}
        onSelectFile={openFile}
      />

      <main className="workspace">
        {loading && <div className="loading-bar" />}

        <div className="split-view">
          <MarkdownEditor
            content={content}
            fileName={activeFile}
            isDirty={isDirty}
            onChange={updateContent}
          />
          <div className="split-divider" />
          <MarkdownPreview
            content={content}
            files={flatFiles}
            onWikiLinkClick={openFile}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
