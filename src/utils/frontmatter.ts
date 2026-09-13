export interface ParsedFrontmatter {
  /** Raw YAML between the `---` delimiters. */
  block: string;
  /** Note content after the frontmatter block. */
  body: string;
}

/** Splits a leading `---\n...\n---` YAML frontmatter block off a note's content, if present. */
export function extractFrontmatter(content: string): ParsedFrontmatter | null {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return null;

  const block = content.slice(3, end);
  const restStart = content.indexOf("\n", end + 4);
  const body = restStart === -1 ? "" : content.slice(restStart + 1);

  return { block, body };
}

/** Extracts `tags:` from a frontmatter YAML block (inline `[a, b]` or bulleted list form). */
export function parseFrontmatterTags(block: string): string[] {
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

/** Extracts simple `key: value` pairs from a frontmatter block, skipping the `tags` key. */
export function parseFrontmatterFields(block: string): [string, string][] {
  const lines = block.split("\n");
  const fields: [string, string][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    if (/^\s*tags:\s*$/i.test(line)) {
      let j = i + 1;
      while (j < lines.length && /^\s*-\s*\S/.test(lines[j])) j++;
      i = j - 1;
      continue;
    }
    if (/^\s*tags:\s*\[.*\]\s*$/i.test(line)) continue;

    const kv = line.match(/^\s*([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      const [, key, value] = kv;
      fields.push([key, value.trim().replace(/^["']|["']$/g, "")]);
    }
  }

  return fields;
}
