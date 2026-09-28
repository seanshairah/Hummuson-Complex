"use client";

import { useCallback, useRef, useState } from "react";
import type { Block, DesignPage, FlipbookDesign } from "@/lib/flipbook/model";

/**
 * The design being edited, with undo and redo.
 *
 * A change can carry a merge key: consecutive changes with the same key
 * within a moment of each other are one step in the history, so a drag, a
 * slider or a burst of typing undoes in one go rather than pixel by pixel.
 */

const LIMIT = 150;
const MERGE_MS = 1200;

interface History {
  past: FlipbookDesign[];
  present: FlipbookDesign;
  future: FlipbookDesign[];
}

export function useDesign(initial: FlipbookDesign) {
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });
  const merge = useRef<{ key: string | null; at: number }>({ key: null, at: 0 });

  const change = useCallback(
    (update: (design: FlipbookDesign) => FlipbookDesign, mergeKey?: string) => {
      // Decided out here, not in the updater: React may run an updater twice.
      const now = Date.now();
      const merging =
        mergeKey !== undefined && merge.current.key === mergeKey && now - merge.current.at < MERGE_MS;
      merge.current = { key: mergeKey ?? null, at: now };
      setHistory((current) => {
        const next = update(current.present);
        if (next === current.present) return current;
        return {
          past: merging ? current.past : [...current.past, current.present].slice(-LIMIT),
          present: next,
          future: [],
        };
      });
    },
    [],
  );

  const undo = useCallback(() => {
    merge.current = { key: null, at: 0 };
    setHistory((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    merge.current = { key: null, at: 0 };
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  /** Ends any merge in progress: the next change starts a new step. */
  const checkpoint = useCallback(() => {
    merge.current = { key: null, at: 0 };
  }, []);

  return {
    design: history.present,
    change,
    undo,
    redo,
    checkpoint,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

/* ── Immutable edits ────────────────────────────────────────────────────── */

export function mapPage(
  design: FlipbookDesign,
  pageId: string,
  update: (page: DesignPage) => DesignPage,
): FlipbookDesign {
  let changed = false;
  const pages = design.pages.map((page) => {
    if (page.id !== pageId) return page;
    const next = update(page);
    if (next !== page) changed = true;
    return next;
  });
  return changed ? { ...design, pages } : design;
}

export function mapBlock(
  design: FlipbookDesign,
  pageId: string,
  blockId: string,
  update: (block: Block) => Block,
): FlipbookDesign {
  return mapPage(design, pageId, (page) => {
    let changed = false;
    const blocks = page.blocks.map((block) => {
      if (block.id !== blockId) return block;
      const next = update(block);
      if (next !== block) changed = true;
      return next;
    });
    return changed ? { ...page, blocks } : page;
  });
}

export function patchBlock(
  design: FlipbookDesign,
  pageId: string,
  blockId: string,
  patch: Partial<Block>,
): FlipbookDesign {
  return mapBlock(design, pageId, blockId, (block) => {
    for (const [key, value] of Object.entries(patch)) {
      if ((block as unknown as Record<string, unknown>)[key] !== value) {
        return { ...block, ...patch } as Block;
      }
    }
    return block;
  });
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item!);
  return next;
}
