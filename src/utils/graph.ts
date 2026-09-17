import type { FlatFile } from "../types";
import { extractWikiLinkTargets, resolveWikiLink } from "./wikiLinks";
import { basename, joinPath, parentDir } from "./paths";

export interface GraphNode {
  id: string;
  label: string;
  file: FlatFile;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface NoteGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function extractMarkdownTargets(content: string): string[] {
  const targets: string[] = [];
  const regex = /\[[^\]]*\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    let target = match[1];
    try {
      target = decodeURIComponent(target);
    } catch {
      // Keep malformed percent-encoding literal rather than breaking the graph.
    }
    target = target.split(/[?#]/)[0];
    if (!/^[a-z][a-z0-9+.-]*:/i.test(target) && target.toLowerCase().endsWith(".md")) {
      targets.push(target);
    }
  }
  return targets;
}

function resolveMarkdownLink(target: string, source: FlatFile, files: FlatFile[]) {
  const candidate = joinPath(parentDir(source.path), target);
  const normalized = candidate.replace(/\\/g, "/").replace(/\/\.\//g, "/");
  return files.find((file) => file.path.replace(/\\/g, "/") === normalized)
    ?? files.find((file) => basename(file.path).toLowerCase() === basename(target).toLowerCase());
}

export function buildNoteGraph(files: FlatFile[], contents: Record<string, string>): NoteGraph {
  const edges = new Map<string, GraphEdge>();
  for (const source of files) {
    const content = contents[source.path] ?? "";
    const targets = [
      ...extractWikiLinkTargets(content).map((target) => resolveWikiLink(target, files)),
      ...extractMarkdownTargets(content).map((target) => resolveMarkdownLink(target, source, files)),
    ];
    for (const target of targets) {
      if (!target || target.path === source.path) continue;
      const key = `${source.path}\u0000${target.path}`;
      edges.set(key, { source: source.path, target: target.path });
    }
  }
  return {
    nodes: files.map((file) => ({ id: file.path, label: file.name.replace(/\.md$/i, ""), file })),
    edges: [...edges.values()],
  };
}
