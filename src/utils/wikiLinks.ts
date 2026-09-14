import type { FlatFile } from "../types";

export function flattenFiles(entries: { path: string; name: string; is_dir: boolean; children?: unknown[] }[]): FlatFile[] {
  const result: FlatFile[] = [];
  for (const entry of entries) {
    if (entry.is_dir && entry.children) {
      result.push(...flattenFiles(entry.children as typeof entries));
    } else if (!entry.is_dir) {
      result.push({ name: entry.name, path: entry.path });
    }
  }
  return result;
}

export function resolveWikiLink(link: string, files: FlatFile[]): FlatFile | undefined {
  const normalized = link.trim().replace(/\.md$/i, "").toLowerCase();

  return files.find((f) => {
    const baseName = f.name.replace(/\.md$/i, "").toLowerCase();
    return baseName === normalized;
  });
}

export function preprocessWikiLinks(content: string): string {
  return content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target: string, alias?: string) => {
      const label = (alias ?? target).trim();
      return `[${label}](wiki://${encodeURIComponent(target.trim())})`;
    },
  );
}

/** True if a URL has an explicit scheme (http:, mailto:, wiki:, etc). */
export function hasScheme(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

/** Extracts the raw targets of every [[wiki link]] in a note's content. */
export function extractWikiLinkTargets(content: string): string[] {
  const targets: string[] = [];
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    targets.push(match[1].trim());
  }
  return targets;
}

/** Finds every file whose content links to `activeFile` via a [[wiki link]]. */
export function findBacklinks(
  activeFile: FlatFile | null,
  files: FlatFile[],
  contents: Record<string, string>,
): FlatFile[] {
  if (!activeFile) return [];

  const backlinks: FlatFile[] = [];
  for (const file of files) {
    if (file.path === activeFile.path) continue;
    const text = contents[file.path];
    if (!text) continue;

    const targets = extractWikiLinkTargets(text);
    const linksToActive = targets.some(
      (target) => resolveWikiLink(target, files)?.path === activeFile.path,
    );
    if (linksToActive) backlinks.push(file);
  }

  return backlinks;
}
