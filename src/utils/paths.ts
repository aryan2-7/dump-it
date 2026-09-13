export function joinPath(base: string, ...parts: string[]): string {
  const sep = base.includes("\\") ? "\\" : "/";
  return [base, ...parts]
    .join(sep)
    .replace(/[/\\]+/g, sep);
}

export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/\.md$/i, "");
  const cleaned = trimmed.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, " ");
  return cleaned || "Untitled";
}

export function parentDir(filePath: string): string {
  const sep = filePath.includes("\\") ? "\\" : "/";
  const idx = filePath.lastIndexOf(sep);
  return idx === -1 ? filePath : filePath.slice(0, idx);
}
