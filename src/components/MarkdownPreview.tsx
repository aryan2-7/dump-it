import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { FlatFile } from "../types";
import { hasScheme, preprocessWikiLinks, resolveWikiLink } from "../utils/wikiLinks";

interface MarkdownPreviewProps {
  content: string;
  files: FlatFile[];
  onWikiLinkClick: (path: string) => void;
}

export function MarkdownPreview({ content, files, onWikiLinkClick }: MarkdownPreviewProps) {
  const processed = preprocessWikiLinks(content);

  return (
    <div className="preview-pane">
      <div className="pane-header">
        <span className="pane-title preview-label">Preview</span>
      </div>
      <div className="markdown-preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              if (!href) return <span>{children}</span>;

              // Wiki-style [[links]], preprocessed into wiki:// pseudo-urls.
              if (href.startsWith("wiki://")) {
                const target = decodeURIComponent(href.slice("wiki://".length));
                const resolved = resolveWikiLink(target, files);
                return (
                  <button
                    type="button"
                    className={`wiki-link${resolved ? "" : " unresolved"}`}
                    onClick={() => resolved && onWikiLinkClick(resolved.path)}
                    title={resolved ? resolved.path : `Unresolved: ${target}`}
                  >
                    {children}
                  </button>
                );
              }

              // Plain relative markdown links that happen to point at a note
              // in the vault (e.g. "[Getting Started](Getting Started.md)")
              // should navigate inside the app instead of leaving it.
              if (!hasScheme(href)) {
                const decoded = decodeURIComponent(href.split(/[?#]/)[0]);
                const base = decoded.split(/[/\\]/).pop() ?? decoded;
                const resolved = resolveWikiLink(base, files);
                if (resolved) {
                  return (
                    <button
                      type="button"
                      className="wiki-link"
                      onClick={() => onWikiLinkClick(resolved.path)}
                      title={resolved.path}
                    >
                      {children}
                    </button>
                  );
                }
              }

              // Everything else (http/https/mailto/unresolved relative links)
              // is opened with the OS default handler instead of navigating
              // the app's own webview away from the note.
              return (
                <a
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    openUrl(href).catch(() => {});
                  }}
                >
                  {children}
                </a>
              );
            },
            code: ({ className, children, ...props }) => {
              const isBlock = className?.includes("language-");
              if (isBlock) {
                return (
                  <pre className="code-block">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                );
              }
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {processed}
        </ReactMarkdown>
      </div>
    </div>
  );
}
