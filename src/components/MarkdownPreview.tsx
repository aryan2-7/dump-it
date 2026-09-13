import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { FlatFile } from "../types";
import { preprocessWikiLinks, resolveWikiLink } from "../utils/wikiLinks";

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
              if (href?.startsWith("wiki://")) {
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
              return (
                <a href={href} target="_blank" rel="noreferrer">
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
