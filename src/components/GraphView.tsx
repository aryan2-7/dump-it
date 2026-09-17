import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { BackendGraphData } from "../hooks/useGraph";
import type { GraphGroup, GraphSettings } from "../hooks/useGraphSettings";

interface GraphViewProps {
  data: BackendGraphData;
  settings: GraphSettings;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

interface Camera {
  zoom: number;
  panX: number;
  panY: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  title: string;
  linkCount: number;
  isResolved: boolean;
  tags: string[];
  radius: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {}

function toScreen(gx: number, gy: number, cam: Camera) {
  return { x: gx * cam.zoom + cam.panX, y: gy * cam.zoom + cam.panY };
}

function toGraph(sx: number, sy: number, cam: Camera) {
  return { x: (sx - cam.panX) / cam.zoom, y: (sy - cam.panY) / cam.zoom };
}

const DEFAULT_NODE_COLOR = "#7f6df2";

interface GraphPalette {
  node: string;
  edge: string;
  label: string;
  labelBright: string;
  unresolved: string;
  accent: string;
}

/** Theme-aware canvas palette, derived from the CSS theme variables so the
 *  graph recolors with the app theme (Default / Gruvbox). Read once per draw. */
function readPalette(): GraphPalette {
  const css = getComputedStyle(document.documentElement);
  const cssVar = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    node: cssVar("--wiki-link", DEFAULT_NODE_COLOR),
    edge: cssVar("--text-faint", "#888888"),
    label: cssVar("--text-muted", "#bbbbbb"),
    labelBright: cssVar("--text", "#ffffff"),
    unresolved: cssVar("--wiki-unresolved", "#e06c75"),
    accent: cssVar("--accent", "#9485f4"),
  };
}
const DRAG_THRESHOLD = 4;

function matchesQuery(node: SimNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (node.title.toLowerCase().includes(q)) return true;
  return node.tags.some((t) => t.toLowerCase().includes(q));
}

function colorForNode(node: SimNode, groups: GraphGroup[], fallback: string): string {
  // Later groups override earlier ones.
  let color = fallback;
  for (const group of groups) {
    if (group.query && matchesQuery(node, group.query)) color = group.color;
  }
  return color;
}

export function GraphView({ data, settings, activeFile, onSelectFile }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const camRef = useRef<Camera>({ zoom: 1, panX: 0, panY: 0 });
  const hoveredRef = useRef<SimNode | null>(null);
  const highlightedRef = useRef<Set<string>>(new Set());
  const activeFileRef = useRef(activeFile);
  activeFileRef.current = activeFile;
  const onSelectRef = useRef(onSelectFile);
  onSelectRef.current = onSelectFile;
  const drawRef = useRef<() => void>(() => {});

  // ── local view state ──
  // Physics, appearance, filters and groups live in shared graph settings
  // (edited via Settings → Graph); only the text search stays local.
  const [query, setQuery] = useState("");
  const [animProgress, setAnimProgress] = useState(1);

  // ── context menu (§4.7) ──
  const [menu, setMenu] = useState<{ nodeId: string; title: string; x: number; y: number } | null>(null);

  const { centerForce, repelForce, linkForce, linkDistance, gravity, baseRadius, sizeMultiplier } = settings;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const groupsRef = useRef(settings.groups);
  groupsRef.current = settings.groups;

  const radiusScale = (linkCount: number) => baseRadius + sizeMultiplier * Math.sqrt(linkCount);

  // Filtered topology: recomputed when data or filters change, then pushed
  // into the running simulation with positions preserved (§5.5).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tq = settings.tagFilter.trim().toLowerCase();
    let nodes = data.nodes;
    if (q) {
      nodes = nodes.filter(
        (n) => n.title.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (tq) nodes = nodes.filter((n) => n.tags.some((t) => t.toLowerCase().includes(tq)));
    if (settings.existingOnly) nodes = nodes.filter((n) => n.is_resolved);
    if (settings.hideOrphans) nodes = nodes.filter((n) => n.link_count > 0);
    if (settings.animate) {
      const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      nodes = sorted.slice(0, Math.max(1, Math.floor(sorted.length * animProgress)));
    }
    const ids = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    return { nodes, edges };
  }, [data, query, settings.tagFilter, settings.existingOnly, settings.hideOrphans, settings.animate, animProgress]);

  // Animate mode: reveal nodes incrementally over ~6s.
  useEffect(() => {
    if (!settings.animate) {
      setAnimProgress(1);
      return;
    }
    setAnimProgress(0);
    const start = performance.now();
    const DURATION = 6000;
    let raf = 0;
    const step = (t: number) => {
      setAnimProgress(Math.min(1, (t - start) / DURATION));
      if (t - start < DURATION) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [settings.animate, data]);

  // ── draw ──
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw();
    }

    function draw() {
      const s = settingsRef.current;
      const cam = camRef.current;
      const pal = readPalette();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const highlighted = highlightedRef.current;
      const dim = (id: string) => (highlighted.size === 0 || highlighted.has(id) ? 1 : 0.15);

      // edges
      for (const link of linksRef.current) {
        const a = link.source as SimNode;
        const b = link.target as SimNode;
        if (a.x == null || b.x == null) continue;
        const pa = toScreen(a.x, a.y!, cam);
        const pb = toScreen(b.x, b.y!, cam);
        const op =
          highlighted.size === 0 || (highlighted.has(a.id) && highlighted.has(b.id)) ? 1 : 0.12;
        ctx.globalAlpha = op * 0.55;
        ctx.strokeStyle = pal.edge;
        ctx.lineWidth = s.linkThickness;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        if (s.showArrows) {
          const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
          const r = (b.radius ?? 6) * cam.zoom;
          const tipX = pb.x - Math.cos(angle) * (r + 2);
          const tipY = pb.y - Math.sin(angle) * (r + 2);
          const size = 4 + s.linkThickness;
          ctx.globalAlpha = op * 0.9;
          ctx.fillStyle = pal.edge;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - size * Math.cos(angle - 0.45), tipY - size * Math.sin(angle - 0.45));
          ctx.lineTo(tipX - size * Math.cos(angle + 0.45), tipY - size * Math.sin(angle + 0.45));
          ctx.closePath();
          ctx.fill();
        }
      }

      // nodes
      for (const node of nodesRef.current) {
        if (node.x == null) continue;
        const p = toScreen(node.x, node.y!, cam);
        if (p.x < -50 || p.y < -30 || p.x > W + 50 || p.y > H + 30) continue;
        const r = node.radius * cam.zoom;
        const color = colorForNode(node, groupsRef.current, pal.node);
        const isActive = node.id === activeFileRef.current;
        const isHovered = hoveredRef.current === node;

        ctx.globalAlpha = dim(node.id);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.5, r + (isHovered ? 2 : 0)), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (!node.isResolved) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = pal.unresolved;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (isActive || isHovered) {
          ctx.strokeStyle = isActive ? pal.accent : pal.labelBright;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // labels fade in above the zoom threshold (§6.3)
        if (cam.zoom >= s.labelThreshold && r > 2) {
          const fade = Math.min(1, (cam.zoom - s.labelThreshold) / 0.4 + 0.25);
          ctx.globalAlpha = dim(node.id) * Math.min(1, fade);
          ctx.font = `${isActive || isHovered ? "700 " : ""}${11 + Math.min(3, cam.zoom)}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(30,30,30,0.9)";
          const ly = p.y - r - 5;
          ctx.strokeText(node.title, p.x, ly);
          ctx.fillStyle = isActive || isHovered ? pal.labelBright : pal.label;
          ctx.fillText(node.title, p.x, ly);
        }
      }
      ctx.globalAlpha = 1;
    }

    drawRef.current = draw;
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    resize();
    return () => ro.disconnect();
  }, []);

  // ── simulation lifecycle + diff-merge (§5) ──
  useEffect(() => {
    const sim = forceSimulation<SimNode, SimLink>([])
      .force("charge", forceManyBody().strength(-repelForce))
      .force("link", forceLink<SimNode, SimLink>([]).id((d) => d.id).distance(linkDistance).strength(linkForce))
      .force("center", forceCenter(0, 0).strength(centerForce))
      .force("gravityX", forceX(0).strength(gravity))
      .force("gravityY", forceY(0).strength(gravity))
      .force("collide", forceCollide<SimNode>((d) => d.radius + 4));
    sim.on("tick", () => drawRef.current());
    simRef.current = sim;
    // center the camera once the canvas has a size
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        camRef.current.panX = canvas.clientWidth / 2;
        camRef.current.panY = canvas.clientHeight / 2;
      }
    });
    return () => {
      sim.stop();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // force params → simulation (§5.2)
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    (sim.force("charge") as ReturnType<typeof forceManyBody>)?.strength(-repelForce);
    const link = sim.force("link") as ReturnType<typeof forceLink<SimNode, SimLink>>;
    link?.distance(linkDistance).strength(linkForce);
    (sim.force("center") as ReturnType<typeof forceCenter>)?.strength(centerForce);
    (sim.force("gravityX") as ReturnType<typeof forceX<SimNode>>)?.strength(gravity);
    (sim.force("gravityY") as ReturnType<typeof forceY<SimNode>>)?.strength(gravity);
    for (const n of nodesRef.current) n.radius = radiusScale(n.linkCount);
    (sim.force("collide") as ReturnType<typeof forceCollide<SimNode>>)?.radius((d) => (d as SimNode).radius + 4);
    sim.alpha(0.3).restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerForce, repelForce, linkForce, linkDistance, gravity, baseRadius, sizeMultiplier]);

  // topology → simulation with position-preserving merge (§5.5)
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]));
    const next: SimNode[] = filtered.nodes.map((n, i) => {
      const old = prev.get(n.id);
      if (old) {
        old.title = n.title;
        old.linkCount = n.link_count;
        old.isResolved = n.is_resolved;
        old.tags = n.tags;
        old.radius = radiusScale(n.link_count);
        return old;
      }
      const angle = (i / Math.max(filtered.nodes.length, 1)) * Math.PI * 2;
      return {
        id: n.id,
        title: n.title,
        linkCount: n.link_count,
        isResolved: n.is_resolved,
        tags: n.tags,
        radius: radiusScale(n.link_count),
        x: Math.cos(angle) * 120 + (Math.random() - 0.5) * 40,
        y: Math.sin(angle) * 120 + (Math.random() - 0.5) * 40,
      } as SimNode;
    });
    const byId = new Map(next.map((n) => [n.id, n]));
    const nextLinks: SimLink[] = filtered.edges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => ({ source: byId.get(e.source)!, target: byId.get(e.target)! }));
    // drop hover state for removed nodes
    if (hoveredRef.current && !byId.has(hoveredRef.current.id)) {
      hoveredRef.current = null;
      highlightedRef.current = new Set();
    }
    nodesRef.current = next;
    linksRef.current = nextLinks;
    sim.nodes(next);
    (sim.force("link") as ReturnType<typeof forceLink<SimNode, SimLink>>)?.links(nextLinks);
    sim.alpha(0.3).restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // redraw on highlight-relevant changes
  useEffect(() => {
    drawRef.current();
  }, [activeFile, settings.groups, settings.linkThickness, settings.showArrows, settings.labelThreshold]);

  // repaint when the app theme changes (palette is read per draw)
  useEffect(() => {
    const observer = new MutationObserver(() => drawRef.current());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // ── input: self-contained canvas surface (§4) ──
  useEffect(() => {
    const canvas = canvasRef.current!;
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;
    let downPos: { x: number; y: number } | null = null;
    let draggedNode: SimNode | null = null;

    const pos = (e: PointerEvent | MouseEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    function hitTest(sx: number, sy: number): SimNode | null {
      const cam = camRef.current;
      const g = toGraph(sx, sy, cam);
      // iterate front-to-back (larger nodes first) for stable picking
      const nodes = [...nodesRef.current].sort((a, b) => b.radius - a.radius);
      for (const node of nodes) {
        if (node.x == null || node.y == null) continue;
        const dx = node.x - g.x;
        const dy = node.y - g.y;
        if (Math.hypot(dx, dy) <= Math.max(node.radius, 4 / cam.zoom)) return node;
      }
      return null;
    }

    function neighborIds(id: string): Set<string> {
      const set = new Set<string>([id]);
      for (const l of linksRef.current) {
        const s = (l.source as SimNode).id;
        const t = (l.target as SimNode).id;
        if (s === id) set.add(t);
        if (t === id) set.add(s);
      }
      return set;
    }

    function setHover(node: SimNode | null) {
      if (hoveredRef.current === node) return;
      hoveredRef.current = node;
      highlightedRef.current = node ? neighborIds(node.id) : new Set();
      canvas.style.cursor = node ? "pointer" : "default";
      drawRef.current();
    }

    // wheel → zoom anchored on cursor (§4.2), never scrolls the page
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camRef.current;
      const p = pos(e);
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const g = toGraph(p.x, p.y, cam);
      cam.zoom = Math.min(5, Math.max(0.1, cam.zoom * factor));
      cam.panX = p.x - g.x * cam.zoom;
      cam.panY = p.y - g.y * cam.zoom;
      drawRef.current();
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.focus();
      setMenu(null);
      downPos = { x: e.clientX, y: e.clientY };
      const p = pos(e);
      const hit = hitTest(p.x, p.y);
      if (hit) {
        draggedNode = hit;
        canvas.setPointerCapture(e.pointerId);
      } else {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const cam = camRef.current;
      if (isPanning) {
        cam.panX += e.clientX - lastX;
        cam.panY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        drawRef.current();
        return;
      }
      if (downPos && draggedNode) {
        const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (dist > DRAG_THRESHOLD) {
          const p = pos(e);
          const g = toGraph(p.x, p.y, cam);
          draggedNode.fx = g.x;
          draggedNode.fy = g.y;
          simRef.current?.alpha(0.1).restart();
          drawRef.current();
        }
        return;
      }
      // hover highlight (§6.4)
      const p = pos(e);
      setHover(hitTest(p.x, p.y));
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = downPos ? Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) : Infinity;
      if (draggedNode && dist <= DRAG_THRESHOLD) {
        if (draggedNode.isResolved) onSelectRef.current(draggedNode.id);
      } else if (draggedNode) {
        draggedNode.fx = null;
        draggedNode.fy = null;
        simRef.current?.alpha(0.2).restart();
      }
      isPanning = false;
      downPos = null;
      draggedNode = null;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const p = pos(e);
      const hit = hitTest(p.x, p.y);
      if (hit) {
        const rect = canvas.getBoundingClientRect();
        setMenu({ nodeId: hit.id, title: hit.title, x: rect.left + p.x, y: rect.top + p.y });
      } else {
        setMenu(null);
      }
    };

    // keyboard pan/zoom, scoped to the focused canvas (§4.4)
    const onKeyDown = (e: KeyboardEvent) => {
      const cam = camRef.current;
      const speed = e.shiftKey ? 40 : 10;
      let handled = true;
      switch (e.key) {
        case "ArrowUp": cam.panY += speed; break;
        case "ArrowDown": cam.panY -= speed; break;
        case "ArrowLeft": cam.panX += speed; break;
        case "ArrowRight": cam.panX -= speed; break;
        case "+":
        case "=": cam.zoom = Math.min(5, cam.zoom * 1.1); break;
        case "-":
        case "_": cam.zoom = Math.max(0.1, cam.zoom * 0.9); break;
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        drawRef.current();
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("keydown", onKeyDown);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (data.nodes.length === 0) {
    return <div className="graph-empty">Open a vault with notes to see their connections.</div>;
  }

  return (
    <div className="graph-view canvas-mode">
      <div className="graph-header">
        <div>
          <strong>Note Graph</strong>
          <span>{filtered.nodes.length} notes · {filtered.edges.length} links</span>
        </div>
        <div className="graph-header-controls">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter notes…"
            aria-label="Filter graph notes"
          />
        </div>
      </div>
      <div className="graph-body">
        <div className="graph-canvas-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} tabIndex={0} aria-label="Graph of note connections" />
          {menu && (
            <div
              className="context-menu"
              style={{ left: menu.x, top: menu.y, position: "fixed" }}
              onMouseLeave={() => setMenu(null)}
            >
              <div className="context-menu-title">{menu.title}</div>
              <button
                onClick={() => {
                  setMenu(null);
                  onSelectFile(menu.nodeId);
                }}
              >
                Open note
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  void navigator.clipboard?.writeText(menu.nodeId).catch(() => {});
                }}
              >
                Copy path
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
