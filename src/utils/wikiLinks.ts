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
  return content.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, (_match, target: string) => {
    return `[${target}](wiki://${encodeURIComponent(target.trim())})`;
  });
}
