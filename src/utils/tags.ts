import type { FlatFile } from "../types";
import { extractFrontmatter, parseFrontmatterTags } from "./frontmatter";

const TAG_REGEX = /(^|\s)#([A-Za-z][\w\-/]*)/g;

/** Extracts unique lowercase tags from a note's content (frontmatter `tags:` + inline `#tags`). */
export function parseTags(content: string): string[] {
  const tags = new Set<string>();
  const fm = extractFrontmatter(content);
  const body = fm ? fm.body : content;

  if (fm) {
    for (const t of parseFrontmatterTags(fm.block)) {
      if (t) tags.add(t.toLowerCase());
    }
  }

  const stripped = body.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");

  let match: RegExpExecArray | null;
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(stripped))) {
    tags.add(match[2].toLowerCase());
  }

  return Array.from(tags).sort();
}

/** Builds a tag -> files index across the whole vault from a content cache. */
export function buildTagIndex(
  files: FlatFile[],
  contents: Record<string, string>,
): Map<string, FlatFile[]> {
  const map = new Map<string, FlatFile[]>();

  for (const file of files) {
    const text = contents[file.path];
    if (!text) continue;

    for (const tag of parseTags(text)) {
      const list = map.get(tag);
      if (list) list.push(file);
      else map.set(tag, [file]);
    }
  }

  return map;
}
