import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { FlatFile } from "../types";
import { hasScheme, preprocessWikiLinks, resolveWikiLink } from "../utils/wikiLinks";
import { extractFrontmatter, parseFrontmatterFields, parseFrontmatterTags } from "../utils/frontmatter";

interface MarkdownPreviewProps {
  content: string;
  files: FlatFile[];
  backlinks: FlatFile[];
  onWikiLinkClick: (path: string) => void;
}

export function MarkdownPreview({ content, files, backlinks, onWikiLinkClick }: MarkdownPreviewProps) {
  const fm = extractFrontmatter(content);
  const body = fm ? fm.body : content;
  const fields = fm ? parseFrontmatterFields(fm.block) : [];
  const tags = fm ? parseFrontmatterTags(fm.block) : [];
  const processed = preprocessWikiLinks(body);

  return (
    <div className="preview-pane">
      <div className="pane-header">
        <span className="pane-title preview-label">Preview</span>
      </div>
      <div className="markdown-preview">
        {(fields.length > 0 || tags.length > 0) && (
          <div className="note-properties">
            {fields.map(([key, value]) => (
              <div className="note-property" key={key}>
                <span className="note-property-key">{key}</span>
                <span className="note-property-value">{value}</span>
              </div>
            ))}
            {tags.length > 0 && (
              <div className="note-property">
                <span className="note-property-key">tags</span>
                <span className="note-property-value note-property-tags">
                  {tags.map((tag) => (
                    <span className="tag-chip" key={tag}>
                      #{tag}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
        )}

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={(url) => (url.startsWith("wiki://") ? url : defaultUrlTransform(url))}
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

        {backlinks.length > 0 && (
          <div className="backlinks-panel">
            <div className="backlinks-title">Backlinks ({backlinks.length})</div>
            <div className="backlinks-list">
              {backlinks.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  className="wiki-link backlink-item"
                  onClick={() => onWikiLinkClick(f.path)}
                  title={f.path}
                >
                  {f.name.replace(/\.md$/i, "")}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
