import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { FlatFile } from "../types";
import { buildNoteGraph } from "../utils/graph";
import { parseTags } from "../utils/tags";

export interface BackendGraphNode {
  id: string;
  title: string;
  link_count: number;
  is_resolved: boolean;
  tags: string[];
}

export interface BackendGraphEdge {
  source: string;
  target: string;
}

export interface BackendGraphData {
  nodes: BackendGraphNode[];
  edges: BackendGraphEdge[];
}

function localFallback(files: FlatFile[], contents: Record<string, string>): BackendGraphData {
  const g = buildNoteGraph(files, contents);
  const indegree = new Map<string, number>();
  for (const e of g.edges) indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  return {
    nodes: g.nodes.map((n) => ({
      id: n.id,
      title: n.label,
      link_count: indegree.get(n.id) ?? 0,
      is_resolved: true,
      tags: parseTags(contents[n.id] ?? ""),
    })),
    edges: g.edges.map((e) => ({ source: e.source, target: e.target })),
  };
}

/** Loads graph topology from the Rust backend, falling back to a local
 *  build when running outside Tauri (e.g. `vite dev`). Subscribes to the
 *  debounced `graph-updated` event emitted by the backend file-watcher. */
export function useGraphData(
  vaultPath: string | null,
  files: FlatFile[],
  contents: Record<string, string>,
): BackendGraphData {
  const [data, setData] = useState<BackendGraphData>(() => localFallback(files, contents));
  const [backendOk, setBackendOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!vaultPath) {
      setBackendOk(false);
      setData(localFallback(files, contents));
      return;
    }
    invoke<BackendGraphData>("get_graph_data", { vaultPath })
      .then((d) => {
        if (cancelled) return;
        setBackendOk(true);
        setData(d);
      })
      .catch(() => {
        if (cancelled) return;
        setBackendOk(false);
        setData(localFallback(files, contents));
      });
    invoke("watch_vault", { vaultPath }).catch(() => {});
    const unlisten = listen<BackendGraphData>("graph-updated", (event) => {
      setData(event.payload);
    });
    return () => {
      cancelled = true;
      void unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultPath]);

  // Non-Tauri fallback (or no vault): keep the graph live from the local
  // content cache. Under Tauri the backend owns the data and pushes
  // `graph-updated` events from its debounced file-watcher instead.
  useEffect(() => {
    if (!backendOk) setData(localFallback(files, contents));
  }, [files, contents, vaultPath, backendOk]);

  return data;
}
