import type { FlatFile } from "../types";

interface FrontmatterBlock {
  block: string;
  rest: string;
}

function extractFrontmatterBlock(content: string): FrontmatterBlock | null {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = content.slice(3, end);
  const restStart = content.indexOf("\n", end + 4);
  const rest = restStart === -1 ? "" : content.slice(restStart + 1);
  return { block, rest };
}

function parseFrontmatterTags(block: string): string[] {
  const lines = block.split("\n");
  const tags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const inline = line.match(/^\s*tags:\s*\[(.*)\]\s*$/i);
    if (inline) {
      tags.push(
        ...inline[1]
          .split(",")
          .map((t) => t.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean),
      );
      continue;
    }

    if (/^\s*tags:\s*$/i.test(line)) {
      let j = i + 1;
      while (j < lines.length && /^\s*-\s*\S/.test(lines[j])) {
        tags.push(
          lines[j]
            .replace(/^\s*-\s*/, "")
            .trim()
            .replace(/^["']|["']$/g, ""),
        );
        j++;
      }
    }
  }

  return tags;
}

const TAG_REGEX = /(^|\s)#([A-Za-z][\w\-/]*)/g;

/** Extracts unique lowercase tags from a note's content (frontmatter `tags:` + inline `#tags`). */
export function parseTags(content: string): string[] {
  const tags = new Set<string>();
  const fm = extractFrontmatterBlock(content);
  const body = fm ? fm.rest : content;

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
