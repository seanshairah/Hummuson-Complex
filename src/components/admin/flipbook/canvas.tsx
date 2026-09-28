"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, ImagePlus, Lock } from "lucide-react";
import { PageView } from "@/components/flipbook/page-view";
import { PAGE_H, PAGE_W, type Block, type DesignPage, type TextBlock } from "@/lib/flipbook/model";
import type { ResolvedPage } from "@/lib/flipbook/resolve";
import { cn } from "@/lib/utils";

/**
 * The page being designed, drawn exactly as readers will see it, with an
 * editing layer on top: click to select, drag to move, the handles to resize
 * and rotate, double-click text to type into it. Edges and centres snap to
 * the page and to other blocks (hold Alt to place freely).
 */

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: { id: Handle; x: -1 | 0 | 1; y: -1 | 0 | 1; cursor: string }[] = [
  { id: "nw", x: -1, y: -1, cursor: "nwse-resize" },
  { id: "n", x: 0, y: -1, cursor: "ns-resize" },
  { id: "ne", x: 1, y: -1, cursor: "nesw-resize" },
  { id: "e", x: 1, y: 0, cursor: "ew-resize" },
  { id: "se", x: 1, y: 1, cursor: "nwse-resize" },
  { id: "s", x: 0, y: 1, cursor: "ns-resize" },
  { id: "sw", x: -1, y: 1, cursor: "nesw-resize" },
  { id: "w", x: -1, y: 0, cursor: "ew-resize" },
];

const MIN = 4;

/** The site's own font variables (the page's --fb-* ones exist inside pages only). */
const EDITOR_FONT: Record<TextBlock["font"], string> = {
  display: "var(--font-display)",
  sans: "var(--font-sans)",
  serif: "var(--font-editorial)",
};

interface Drag {
  kind: "move" | "resize" | "rotate";
  id: string;
  start: { x: number; y: number; w: number; h: number; rotate: number };
  px: number;
  py: number;
  handle?: (typeof HANDLES)[number];
  session: string;
  moved: boolean;
}

interface Guides {
  v: number[];
  h: number[];
}

/** The margin the layouts use (templates.ts), which blocks snap to as well. */
const MARGIN = 42;

function snapLines(page: DesignPage, exclude: string) {
  const xs = [0, MARGIN, PAGE_W / 2, PAGE_W - MARGIN, PAGE_W];
  const ys = [0, MARGIN, PAGE_H / 2, PAGE_H - MARGIN, PAGE_H];
  for (const block of page.blocks) {
    if (block.id === exclude || block.hidden || block.rotate % 360 !== 0) continue;
    xs.push(block.x, block.x + block.w / 2, block.x + block.w);
    ys.push(block.y, block.y + block.h / 2, block.y + block.h);
  }
  return { xs, ys };
}

/** The nearest line within reach of any of `edges`, as an offset to apply. */
function nearest(edges: number[], lines: number[], reach: number): { offset: number; line: number } | null {
  let best: { offset: number; line: number } | null = null;
  for (const edge of edges) {
    for (const line of lines) {
      const offset = line - edge;
      if (Math.abs(offset) <= reach && (!best || Math.abs(offset) < Math.abs(best.offset))) {
        best = { offset, line };
      }
    }
  }
  return best;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function DesignCanvas({
  page,
  resolved,
  selectedId,
  editingId,
  zoom,
  onSelect,
  onPatch,
  onStartEditing,
  onStopEditing,
  onText,
  onPickImage,
}: {
  page: DesignPage;
  resolved: ResolvedPage | null;
  selectedId: string | null;
  editingId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  onPatch: (id: string, patch: Partial<Block>, mergeKey: string) => void;
  onStartEditing: (id: string) => void;
  onStopEditing: () => void;
  onText: (id: string, text: string) => void;
  onPickImage: (id: string) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(480);
  const [guides, setGuides] = useState<Guides>({ v: [], h: [] });
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const measure = () => {
      const w = area.clientWidth - 64;
      const h = area.clientHeight - 64;
      setFit(Math.max(220, Math.min(w, (h * PAGE_W) / PAGE_H)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  const width = Math.round(fit * zoom);
  const k = width / PAGE_W;
  const height = Math.round(PAGE_H * k);

  const view: ResolvedPage | null = resolved
    ? {
        ...resolved,
        blocks: resolved.blocks.filter((block) => !block.hidden && block.id !== editingId),
      }
    : null;
  const resolvedById = new Map(resolved?.blocks.map((block) => [block.id, block]) ?? []);

  const begin = (
    event: ReactPointerEvent<HTMLElement>,
    block: Block,
    kind: Drag["kind"],
    handle?: Drag["handle"],
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    onSelect(block.id);
    if (block.locked || editingId === block.id) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind,
      id: block.id,
      start: { x: block.x, y: block.y, w: block.w, h: block.h, rotate: block.rotate },
      px: event.clientX,
      py: event.clientY,
      handle,
      session: `${kind}:${block.id}:${Date.now()}`,
      moved: false,
    };
  };

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = (event.clientX - current.px) / k;
    const dy = (event.clientY - current.py) / k;
    if (!current.moved && Math.hypot(dx * k, dy * k) < 3) return;
    current.moved = true;
    const { start } = current;
    const snap = !event.altKey && start.rotate % 360 === 0;
    const reach = 6 / k;
    const lines = snapLines(page, current.id);
    const next: Guides = { v: [], h: [] };

    if (current.kind === "move") {
      let x = start.x + dx;
      let y = start.y + dy;
      if (event.shiftKey) {
        // Along one axis only.
        if (Math.abs(dx) > Math.abs(dy)) y = start.y;
        else x = start.x;
      }
      if (snap) {
        const sx = nearest([x, x + start.w / 2, x + start.w], lines.xs, reach);
        if (sx) {
          x += sx.offset;
          next.v.push(sx.line);
        }
        const sy = nearest([y, y + start.h / 2, y + start.h], lines.ys, reach);
        if (sy) {
          y += sy.offset;
          next.h.push(sy.line);
        }
      }
      onPatch(current.id, { x: round(x), y: round(y) }, current.session);
    }

    if (current.kind === "resize" && current.handle) {
      const { x: hx, y: hy } = current.handle;
      const rad = (start.rotate * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      // The pointer's travel in the block's own (unrotated) frame.
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      let w = Math.max(MIN, start.w + hx * lx);
      let h = Math.max(MIN, start.h + hy * ly);
      if (event.shiftKey && hx !== 0 && hy !== 0) {
        const ratio = start.w / start.h;
        if (w / h > ratio) h = w / ratio;
        else w = h * ratio;
      }
      // Keep the opposite corner or edge where it was.
      const cx = start.x + start.w / 2;
      const cy = start.y + start.h / 2;
      const ax = (-hx * start.w) / 2;
      const ay = (-hy * start.h) / 2;
      const anchorX = cx + ax * cos - ay * sin;
      const anchorY = cy + ax * sin + ay * cos;
      const bx = (-hx * w) / 2;
      const by = (-hy * h) / 2;
      let ncx = anchorX - (bx * cos - by * sin);
      let ncy = anchorY - (bx * sin + by * cos);
      let x = ncx - w / 2;
      let y = ncy - h / 2;

      if (snap) {
        if (hx === 1) {
          const s = nearest([x + w], lines.xs, reach);
          if (s) {
            w += s.offset;
            next.v.push(s.line);
          }
        } else if (hx === -1) {
          const s = nearest([x], lines.xs, reach);
          if (s) {
            x += s.offset;
            w -= s.offset;
            next.v.push(s.line);
          }
        }
        if (hy === 1) {
          const s = nearest([y + h], lines.ys, reach);
          if (s) {
            h += s.offset;
            next.h.push(s.line);
          }
        } else if (hy === -1) {
          const s = nearest([y], lines.ys, reach);
          if (s) {
            y += s.offset;
            h -= s.offset;
            next.h.push(s.line);
          }
        }
        ncx = x + w / 2;
        ncy = y + h / 2;
      }
      onPatch(
        current.id,
        { x: round(x), y: round(y), w: round(Math.max(MIN, w)), h: round(Math.max(MIN, h)) },
        current.session,
      );
    }

    if (current.kind === "rotate" && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      const px = (event.clientX - rect.left) / k;
      const py = (event.clientY - rect.top) / k;
      const cx = start.x + start.w / 2;
      const cy = start.y + start.h / 2;
      let angle = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
      if (angle > 180) angle -= 360;
      if (event.shiftKey) angle = Math.round(angle / 15) * 15;
      else {
        for (const stop of [-180, -90, 0, 90, 180]) {
          if (Math.abs(angle - stop) < 3) angle = stop;
        }
      }
      onPatch(current.id, { rotate: Math.round(angle * 10) / 10 }, current.session);
    }

    setGuides(next);
  };

  const end = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // already released
    }
    drag.current = null;
    setGuides({ v: [], h: [] });
  };

  const selected = page.blocks.find((block) => block.id === selectedId) ?? null;
  const editing = page.blocks.find((block): block is TextBlock => block.id === editingId && block.type === "text");

  const boxStyle = (block: Block) => ({
    left: block.x * k,
    top: block.y * k,
    width: block.w * k,
    height: block.h * k,
    transform: block.rotate ? `rotate(${block.rotate}deg)` : undefined,
  });

  return (
    <div
      ref={areaRef}
      className="scrollbar-none relative flex min-h-0 flex-1 overflow-auto bg-[#e9e6db]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
      style={{ backgroundImage: "radial-gradient(rgb(19 26 18 / .09) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
    >
      <div className="m-auto p-8" onPointerDown={(event) => { if (event.target === event.currentTarget) onSelect(null); }}>
        <div
          ref={pageRef}
          className="relative shadow-[0_24px_60px_-24px_rgb(19_26_18/0.45)]"
          style={{ width, height }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2px]">
            {view && <PageView page={view} />}
          </div>

          {/* Editing layer */}
          <div
            className="absolute inset-0"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) onSelect(null);
            }}
          >
            {page.blocks.map((block) => {
              if (block.hidden) return null;
              const shown = resolvedById.get(block.id);
              const empty = block.type === "image" && shown?.type === "image" && !shown.image;
              return (
                <div
                  key={block.id}
                  data-box={block.id}
                  className={cn(
                    "absolute touch-none",
                    selectedId !== block.id && "hover:outline hover:outline-1 hover:outline-leaf-600/70",
                    empty && "border border-dashed border-ink/35",
                  )}
                  style={{ ...boxStyle(block), cursor: block.locked ? "default" : "move" }}
                  onPointerDown={(event) => begin(event, block, "move")}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                  onDoubleClick={() => {
                    if (block.locked) return;
                    if (block.type === "text") onStartEditing(block.id);
                    if (block.type === "image") onPickImage(block.id);
                  }}
                >
                  {empty && (
                    <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-[11px] leading-tight text-ink-faint">
                      <ImagePlus className="size-5" strokeWidth={1.6} />
                      Double-click to choose a picture
                    </span>
                  )}
                  {shown?.missing && (
                    <span className="pointer-events-none absolute top-0 left-0 inline-flex -translate-y-full items-center gap-1 rounded bg-danger px-1.5 py-0.5 text-[10px] whitespace-nowrap text-paper">
                      <AlertTriangle className="size-3" /> Product no longer listed
                    </span>
                  )}
                </div>
              );
            })}

            {selected && !selected.hidden && (
              <div
                className="pointer-events-none absolute outline outline-[1.5px] outline-leaf-600"
                style={boxStyle(selected)}
              >
                {selected.locked ? (
                  <span className="absolute -top-6 left-0 inline-flex items-center gap-1 rounded bg-humus-900 px-1.5 py-0.5 text-[10px] text-paper">
                    <Lock className="size-3" /> Locked
                  </span>
                ) : (
                  editingId !== selected.id && (
                    <>
                      {HANDLES.map((handle) => (
                        <span
                          key={handle.id}
                          className="pointer-events-auto absolute size-2.5 touch-none rounded-[3px] border border-leaf-700 bg-cream"
                          style={{
                            left: `${((handle.x + 1) / 2) * 100}%`,
                            top: `${((handle.y + 1) / 2) * 100}%`,
                            transform: "translate(-50%, -50%)",
                            cursor: handle.cursor,
                          }}
                          onPointerDown={(event) => begin(event, selected, "resize", handle)}
                          onPointerMove={move}
                          onPointerUp={end}
                          onPointerCancel={end}
                        />
                      ))}
                      <span
                        aria-hidden
                        className="absolute left-1/2 h-4 w-px bg-leaf-600"
                        style={{ top: -16 }}
                      />
                      <span
                        title="Drag to rotate (Shift: 15° steps)"
                        className="pointer-events-auto absolute left-1/2 size-3 -translate-x-1/2 touch-none rounded-full border border-leaf-700 bg-cream"
                        style={{ top: -24, cursor: "grab" }}
                        onPointerDown={(event) => begin(event, selected, "rotate")}
                        onPointerMove={move}
                        onPointerUp={end}
                        onPointerCancel={end}
                      />
                    </>
                  )
                )}
              </div>
            )}

            {editing && (
              <textarea
                autoFocus
                aria-label="Text"
                className="absolute resize-none rounded-[2px] bg-cream/95 outline outline-2 outline-leaf-600"
                style={{
                  ...boxStyle(editing),
                  minHeight: 24,
                  fontFamily: EDITOR_FONT[editing.font],
                  fontSize: editing.size * k,
                  fontWeight: editing.weight,
                  fontStyle: editing.italic ? "italic" : undefined,
                  lineHeight: editing.lineHeight,
                  letterSpacing: `${editing.letterSpacing}em`,
                  textAlign: editing.align,
                  color: "#131a12",
                  padding: editing.padding * k,
                }}
                value={editing.text}
                onChange={(event) => onText(editing.id, event.target.value)}
                onBlur={onStopEditing}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onStopEditing();
                  }
                  event.stopPropagation();
                }}
                onPointerDown={(event) => event.stopPropagation()}
              />
            )}

            {guides.v.map((line, i) => (
              <span
                key={`v${i}`}
                className="pointer-events-none absolute inset-y-0 w-px bg-[#e5484d]"
                style={{ left: line * k }}
              />
            ))}
            {guides.h.map((line, i) => (
              <span
                key={`h${i}`}
                className="pointer-events-none absolute inset-x-0 h-px bg-[#e5484d]"
                style={{ top: line * k }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
