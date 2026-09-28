"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  CloudOff,
  Download,
  Eye,
  History,
  Image as ImageIcon,
  LayoutList,
  Loader2,
  Minus,
  MoreHorizontal,
  MousePointerClick,
  PanelLeft,
  PanelRight,
  Plus,
  QrCode,
  Redo2,
  RotateCcw,
  Send,
  Shapes,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Flipbook } from "@/components/catalogue/flipbook";
import {
  COLORS,
  PAGE_H,
  PAGE_W,
  buttonBlock,
  contentsBlock,
  imageBlock,
  isDarkColor,
  newId,
  qrBlock,
  shapeBlock,
  textBlock,
  type Block,
  type DesignPage,
  type FlipbookDesign,
  type PageBackground,
  type TextBlock,
} from "@/lib/flipbook/model";
import { resolveDesign, type FlipbookContext } from "@/lib/flipbook/resolve";
import { FLIPBOOK_PAGE_CSS } from "@/lib/flipbook/tree";
import { flipbookDownloads } from "@/lib/flipbook/downloads";
import {
  discardFlipbookDraft,
  publishFlipbook,
  rebuildFlipbookDraft,
  restoreFlipbookRevision,
  saveFlipbookDraft,
  revertToAutomaticFlipbook,
} from "@/server/actions/admin/flipbook";
import { cn } from "@/lib/utils";
import { DesignCanvas } from "./canvas";
import { IconButton } from "./controls";
import { BlockInspector, PageInspector, type BlockAction, type ProductOption } from "./inspector";
import { MediaDialog, type LibraryItem } from "./media-dialog";
import { AddPageDialog, PagesPanel } from "./pages-panel";
import { mapBlock, mapPage, moveItem, patchBlock, useDesign } from "./use-design";

export interface RevisionSummary {
  id: string;
  version: number;
  note: string | null;
  actorEmail: string | null;
  createdAt: string;
}

type SaveState =
  | { status: "saved"; at: string | null }
  | { status: "unsaved" }
  | { status: "saving" }
  | { status: "error"; message: string };

type MediaTarget = { kind: "new" } | { kind: "block"; id: string } | { kind: "background" };

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function cloneWithIds(page: DesignPage): DesignPage {
  const copy = structuredClone(page);
  copy.id = newId("p");
  copy.blocks = copy.blocks.map((block) => ({ ...block, id: newId("b") }));
  return copy;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("input, textarea, select, [role=dialog], [role=menu], [role=listbox]")) return true;
  return false;
}

function MenuItem({ children, onSelect, danger }: { children: ReactNode; onSelect: () => void; danger?: boolean }) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-paper-dim",
        danger ? "text-danger" : "text-ink",
      )}
    >
      {children}
    </Menu.Item>
  );
}

function MenuContent({ children, align = "end" }: { children: ReactNode; align?: "start" | "end" }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={6}
        className="z-[60] min-w-56 rounded-xl border border-line bg-cream p-1 shadow-pop"
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

function Confirm({
  open,
  title,
  body,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onCancel()}>
      <DialogContent title={title}>
        <div className="mt-3 space-y-3 text-sm text-ink-soft">{body}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft hover:border-ink/30">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-paper disabled:opacity-60",
              danger ? "bg-danger hover:bg-danger/90" : "bg-humus-900 hover:bg-humus-700",
            )}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FlipbookDesigner({
  initialDesign,
  source,
  version,
  hasPublished,
  publishedAt,
  draftSavedAt,
  context,
  products,
  library: initialLibrary,
  revisions,
  title,
}: {
  initialDesign: FlipbookDesign;
  source: "published" | "draft" | "generated";
  version: number;
  /** Readers see a published design (not the automatic layout). */
  hasPublished: boolean;
  publishedAt: string | null;
  draftSavedAt: string | null;
  context: FlipbookContext;
  products: ProductOption[];
  library: LibraryItem[];
  revisions: RevisionSummary[];
  title: string;
}) {
  const router = useRouter();
  const { design, change, undo, redo, checkpoint, canUndo, canRedo } = useDesign(initialDesign);
  const designRef = useRef(design);
  designRef.current = design;

  const [pageId, setPageId] = useState(initialDesign.pages[0]?.id ?? "");
  const [blockId, setBlockId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panels, setPanels] = useState({ pages: true, inspector: true });
  const [library, setLibrary] = useState(initialLibrary);
  const [mediaTarget, setMediaTarget] = useState<MediaTarget | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "publish" | "discard" | "rebuild" | "automatic" | { restore: RevisionSummary }>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [hasDraft, setHasDraft] = useState(source === "draft");
  const [live, setLive] = useState({ version, publishedAt, designed: hasPublished });
  const [save, setSave] = useState<SaveState>({ status: "saved", at: draftSavedAt });
  const clipboard = useRef<Block | null>(null);
  const lastSaved = useRef(JSON.stringify(initialDesign));
  const saveSeq = useRef(0);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  // Narrow screens start with the side panels folded away.
  useEffect(() => {
    if (window.innerWidth < 1024) setPanels({ pages: false, inspector: false });
  }, []);

  const page = design.pages.find((p) => p.id === pageId) ?? design.pages[0]!;
  const pageIndex = design.pages.indexOf(page);
  const block = page.blocks.find((b) => b.id === blockId) ?? null;

  // Keep the selection pointing at something that exists (undo can remove it).
  useEffect(() => {
    if (!design.pages.some((p) => p.id === pageId) && design.pages[0]) setPageId(design.pages[0].id);
  }, [design, pageId]);
  useEffect(() => {
    if (blockId && !page.blocks.some((b) => b.id === blockId)) setBlockId(null);
    if (editingId && !page.blocks.some((b) => b.id === editingId)) setEditingId(null);
  }, [page, blockId, editingId]);

  const resolved = useMemo(() => resolveDesign(design, context, { designer: true }), [design, context]);

  // Thumbnails redraw only when their own page (or the chapters) change.
  const revisionOf = useRef(new WeakMap<DesignPage, number>());
  const revisionCounter = useRef(0);
  const signatures = useMemo(() => {
    const global = JSON.stringify(design.pages.map((p) => [p.chapter, p.productId ? 1 : 0]));
    return design.pages.map((p, i) => {
      let rev = revisionOf.current.get(p);
      if (rev === undefined) {
        revisionCounter.current += 1;
        rev = revisionCounter.current;
        revisionOf.current.set(p, rev);
      }
      return `${rev}|${i}|${global}`;
    });
  }, [design.pages]);

  /* ── Saving ─────────────────────────────────────────────────────────── */

  const persist = useCallback(async (snapshot: FlipbookDesign): Promise<boolean> => {
    const json = JSON.stringify(snapshot);
    if (json === lastSaved.current) return true;
    const seq = (saveSeq.current += 1);
    setSave({ status: "saving" });
    try {
      const result = await saveFlipbookDraft(snapshot);
      if (seq !== saveSeq.current) return result.ok;
      if (!result.ok) {
        setSave({ status: "error", message: result.error });
        return false;
      }
      lastSaved.current = json;
      setHasDraft(true);
      setSave(
        JSON.stringify(designRef.current) === json
          ? { status: "saved", at: result.savedAt }
          : { status: "unsaved" },
      );
      return true;
    } catch {
      if (seq === saveSeq.current) setSave({ status: "error", message: "The connection dropped." });
      return false;
    }
  }, []);

  useEffect(() => {
    if (JSON.stringify(design) === lastSaved.current) return;
    setSave((current) => (current.status === "saving" ? current : { status: "unsaved" }));
    const timer = window.setTimeout(() => void persist(design), 1200);
    return () => window.clearTimeout(timer);
  }, [design, persist]);

  const flush = useCallback(() => persist(designRef.current), [persist]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(designRef.current) !== lastSaved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  /* ── Edits ──────────────────────────────────────────────────────────── */

  const patch = useCallback(
    (id: string, values: Partial<Block>, key: string) =>
      change((d) => patchBlock(d, page.id, id, values), key),
    [change, page.id],
  );

  const patchPage = useCallback(
    (values: Partial<DesignPage>, key: string) =>
      change((d) => mapPage(d, page.id, (p) => ({ ...p, ...values })), key),
    [change, page.id],
  );

  const patchBackground = useCallback(
    (values: Partial<PageBackground>, key: string) =>
      change((d) => mapPage(d, page.id, (p) => ({ ...p, background: { ...p.background, ...values } })), key),
    [change, page.id],
  );

  const insertBlock = useCallback(
    (created: Block) => {
      checkpoint();
      change((d) => mapPage(d, page.id, (p) => ({ ...p, blocks: [...p.blocks, created] })));
      setBlockId(created.id);
      setPanels((current) => ({ ...current, inspector: true }));
    },
    [change, checkpoint, page.id],
  );

  const blockAction = useCallback(
    (action: BlockAction, id = blockId) => {
      if (!id) return;
      checkpoint();
      change((d) =>
        mapPage(d, page.id, (p) => {
          const index = p.blocks.findIndex((b) => b.id === id);
          if (index < 0) return p;
          const target = p.blocks[index]!;
          switch (action) {
            case "delete":
              return { ...p, blocks: p.blocks.filter((b) => b.id !== id) };
            case "duplicate": {
              const copy = { ...structuredClone(target), id: newId("b"), x: target.x + 12, y: target.y + 12 };
              queueMicrotask(() => setBlockId(copy.id));
              return { ...p, blocks: [...p.blocks.slice(0, index + 1), copy, ...p.blocks.slice(index + 1)] };
            }
            case "front":
              return { ...p, blocks: moveItem(p.blocks, index, p.blocks.length - 1) };
            case "back":
              return { ...p, blocks: moveItem(p.blocks, index, 0) };
            case "forward":
              return { ...p, blocks: moveItem(p.blocks, index, index + 1) };
            case "backward":
              return { ...p, blocks: moveItem(p.blocks, index, index - 1) };
          }
        }),
      );
      if (action === "delete") setBlockId(null);
    },
    [blockId, change, checkpoint, page.id],
  );

  const addPage = (created: DesignPage) => {
    checkpoint();
    change((d) => {
      const at = d.pages.findIndex((p) => p.id === page.id);
      const pages = [...d.pages];
      pages.splice(at + 1, 0, created);
      return { ...d, pages };
    });
    setPageId(created.id);
    setBlockId(null);
  };

  const pageAction = (id: string, action: "duplicate" | "delete" | "hide") => {
    checkpoint();
    change((d) => {
      const index = d.pages.findIndex((p) => p.id === id);
      if (index < 0) return d;
      const target = d.pages[index]!;
      if (action === "duplicate") {
        const copy = cloneWithIds(target);
        copy.name = `${target.name} (copy)`;
        queueMicrotask(() => setPageId(copy.id));
        const pages = [...d.pages];
        pages.splice(index + 1, 0, copy);
        return { ...d, pages };
      }
      if (action === "delete") {
        if (d.pages.length <= 1) return d;
        const pages = d.pages.filter((p) => p.id !== id);
        if (id === pageId) queueMicrotask(() => setPageId(pages[Math.min(index, pages.length - 1)]!.id));
        return { ...d, pages };
      }
      return mapPage(d, id, (p) => ({ ...p, hidden: !p.hidden }));
    });
  };

  const center = (w: number, h: number) => ({ x: Math.round((PAGE_W - w) / 2), y: Math.round((PAGE_H - h) / 2), w, h });
  const productLink = page.productId ? ({ kind: "product" } as const) : ({ kind: "none" } as const);

  // Text starts in colours that read on this page's ground.
  const dark = isDarkColor(page.background.color);
  const ink = {
    strong: dark ? COLORS.paper : COLORS.ink,
    soft: dark ? `${COLORS.paper}b3` : COLORS.inkSoft,
    faint: dark ? `${COLORS.paper}80` : COLORS.inkFaint,
    accent: dark ? COLORS.leaf400 : COLORS.leaf700,
  };

  const addText = (kind: "heading" | "body" | "label") => {
    if (kind === "heading") {
      insertBlock(textBlock({ text: "A heading", font: "display", weight: 600, size: 40, lineHeight: 1.08, letterSpacing: -0.02, color: ink.strong, ...center(480, 96) }));
    } else if (kind === "body") {
      insertBlock(textBlock({ text: "Body text. **Bold words** stand out.", size: 15, lineHeight: 1.6, color: ink.soft, ...center(480, 120) }));
    } else {
      insertBlock(textBlock({ text: "A small label", font: "display", weight: 500, size: 12.5, lineHeight: 1.2, letterSpacing: 0.22, textCase: "upper", color: ink.accent, ...center(320, 20) }));
    }
  };

  const addField = (field: "name" | "description" | "crops" | "packs" | "price" | "picture" | "button") => {
    if (field === "picture") {
      insertBlock(imageBlock({ src: { kind: "product", which: "catalogue" }, gradient: { from: COLORS.paperDim, to: COLORS.paperDeep, angle: 135 }, ...center(360, 300) }));
      return;
    }
    if (field === "button") {
      insertBlock(buttonBlock({ link: { kind: "product" }, ...(dark ? { background: COLORS.leaf400, color: COLORS.humus950 } : {}), ...center(160, 34) }));
      return;
    }
    const presets: Record<string, Partial<TextBlock>> = {
      name: { text: "{{name}}", font: "display", weight: 600, size: 28, lineHeight: 1.2, color: ink.strong },
      description: { text: "{{description}}", size: 14.2, lineHeight: 1.6, color: ink.soft, hideIfEmpty: true },
      crops: { text: "**Crops:** {{crops}}", size: 12.5, color: ink.faint, textCase: "title", maxLines: 2, hideIfEmpty: true },
      packs: { text: "**Packs:** {{packs}}", size: 12.5, color: ink.faint, maxLines: 1, hideIfEmpty: true },
      price: { text: "{{price}}", font: "display", weight: 600, size: 22, color: dark ? COLORS.leaf300 : COLORS.leaf800, hideIfEmpty: true },
    };
    const heights: Record<string, number> = { name: 72, description: 100, crops: 40, packs: 22, price: 32 };
    insertBlock(textBlock({ ...presets[field], ...center(480, heights[field]!) }));
  };

  /* ── Server actions ─────────────────────────────────────────────────── */

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const doPublish = () =>
    run(async () => {
      await flush();
      const result = await publishFlipbook(designRef.current);
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      lastSaved.current = JSON.stringify(designRef.current);
      setHasDraft(false);
      setLive({ version: result.version, publishedAt: new Date().toISOString(), designed: true });
      setSave({ status: "saved", at: null });
      setNotice({ tone: "ok", text: `Published — the flipbook and its downloads now show version ${result.version}.` });
      router.refresh();
    });

  const doDiscard = () =>
    run(async () => {
      const result = await discardFlipbookDraft();
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      lastSaved.current = JSON.stringify(designRef.current);
      window.location.reload();
    });

  const doRebuild = () =>
    run(async () => {
      await flush();
      const result = await rebuildFlipbookDraft();
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      checkpoint();
      lastSaved.current = JSON.stringify(result.design);
      change(() => result.design);
      setPageId(result.design.pages[0]?.id ?? "");
      setBlockId(null);
      setHasDraft(true);
      setNotice({ tone: "ok", text: "Rebuilt from the ranges. The previous draft is in the history." });
      router.refresh();
    });

  const doAutomatic = () =>
    run(async () => {
      const result = await revertToAutomaticFlipbook();
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      lastSaved.current = JSON.stringify(designRef.current);
      window.location.reload();
    });

  const doRestore = (revision: RevisionSummary) =>
    run(async () => {
      await flush();
      const result = await restoreFlipbookRevision(revision.id);
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      checkpoint();
      lastSaved.current = JSON.stringify(result.design);
      change(() => result.design);
      setPageId(result.design.pages[0]?.id ?? "");
      setBlockId(null);
      setHasDraft(true);
      setHistoryOpen(false);
      setNotice({ tone: "ok", text: "That version is now your draft. Publish it to put it live." });
      router.refresh();
    });

  const download = async (format: "pdf" | "html", draft: boolean) => {
    if (draft) await flush();
    const links = flipbookDownloads("", { draft });
    const url = draft ? links[format] : `/api/flipbook/${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.append(a);
    a.click();
    a.remove();
  };

  /* ── Keyboard ───────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (previewOpen || isTyping(event.target)) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (mod && key === "s") {
        event.preventDefault();
        void flush();
        return;
      }
      if (event.key === "PageDown" || event.key === "PageUp") {
        event.preventDefault();
        const next = design.pages[pageIndex + (event.key === "PageDown" ? 1 : -1)];
        if (next) {
          setPageId(next.id);
          setBlockId(null);
        }
        return;
      }
      if (mod && key === "v" && clipboard.current) {
        event.preventDefault();
        const copy = { ...structuredClone(clipboard.current), id: newId("b") };
        copy.x += 12;
        copy.y += 12;
        clipboard.current = copy;
        insertBlock(copy);
        return;
      }
      if (!block) return;
      if (mod && key === "c") {
        clipboard.current = structuredClone(block);
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        blockAction("duplicate");
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        blockAction("delete");
        return;
      }
      if (event.key === "Escape") {
        setBlockId(null);
        return;
      }
      if (event.key === "Enter" && block.type === "text" && !block.locked) {
        event.preventDefault();
        setEditingId(block.id);
        return;
      }
      if (event.key === "[" || event.key === "]") {
        blockAction(event.key === "]" ? "forward" : "backward");
        return;
      }
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const step = arrows[event.key];
      if (step && !block.locked) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        patch(block.id, { x: block.x + step[0] * amount, y: block.y + step[1] * amount }, `${block.id}:nudge`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [block, blockAction, design.pages, flush, insertBlock, pageIndex, patch, previewOpen, redo, undo]);

  /* ── Media ──────────────────────────────────────────────────────────── */

  const chooseMedia = (item: LibraryItem) => {
    const src = { kind: "media" as const, mediaId: item.id, url: item.url, alt: item.alt };
    const target = mediaTarget;
    setMediaTarget(null);
    if (!target) return;
    if (target.kind === "background") {
      patchBackground({ image: src }, `${page.id}:bg-image:${Date.now()}`);
    } else if (target.kind === "block") {
      checkpoint();
      change((d) => mapBlock(d, page.id, target.id, (b) => (b.type === "image" ? { ...b, src } : b)));
    } else {
      const ratio = item.width && item.height ? item.height / item.width : 0.75;
      const w = ratio > 1.4 ? 300 : 400;
      const h = Math.max(40, Math.min(760, Math.round(w * ratio)));
      insertBlock(imageBlock({ src, fit: item.kind === "brand" ? "contain" : "cover", ...center(w, h) }));
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  const pageCount = design.pages.length;
  const hiddenPages = design.pages.filter((p) => p.hidden).length;
  const missingPages = resolved.filter((p) => p.missing).length;
  const previewPages = useMemo(
    () => (previewOpen ? resolveDesign(design, context, { pad: true }) : []),
    [previewOpen, design, context],
  );

  const status = (() => {
    switch (save.status) {
      case "saving":
        return { icon: <Loader2 className="size-3.5 animate-spin" />, text: "Saving…", tone: "text-ink-faint" };
      case "unsaved":
        return { icon: <Circle className="size-2.5 fill-current" />, text: "Unsaved changes", tone: "text-soil-600" };
      case "error":
        return { icon: <CloudOff className="size-3.5" />, text: `Not saved — ${save.message}`, tone: "text-danger" };
      default:
        return {
          icon: <Check className="size-3.5" />,
          text: hasDraft ? `Draft saved${save.at ? ` ${formatTime(save.at)}` : ""}` : "No unpublished changes",
          tone: "text-leaf-700",
        };
    }
  })();

  return (
    <div className="-mx-4 -mt-6 -mb-16 flex h-[calc(100dvh-3.5rem)] flex-col bg-paper md:-mx-8 lg:-mt-8 lg:h-dvh">
      <style>{FLIPBOOK_PAGE_CSS}</style>

      {/* Top bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-cream px-3 py-2.5 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton label={panels.pages ? "Hide pages" : "Show pages"} active={panels.pages} onClick={() => setPanels((p) => ({ ...p, pages: !p.pages }))}>
            <PanelLeft className="size-4" />
          </IconButton>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base leading-tight font-semibold text-ink">Flipbook designer</h1>
            <p className={cn("flex items-center gap-1.5 text-xs", status.tone)} aria-live="polite">
              {status.icon}
              <span className="truncate">{status.text}</span>
              <span className="text-ink-faint">
                · Live:{" "}
                {live.designed
                  ? `version ${live.version}${live.publishedAt ? `, published ${formatTime(live.publishedAt)}` : ""}`
                  : "automatic layout"}
              </span>
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 className="size-4" />
          </IconButton>
          <IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
            <Redo2 className="size-4" />
          </IconButton>
          <span className="mx-1 h-6 w-px bg-line max-sm:hidden" />
          <div className="flex items-center rounded-lg border border-line bg-paper max-sm:hidden">
            <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}>
              <Minus className="size-3.5" />
            </IconButton>
            <button type="button" onClick={() => setZoom(1)} className="w-12 text-center text-xs text-ink-soft tabular-nums" title="Fit the page">
              {Math.round(zoom * 100)}%
            </button>
            <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10))}>
              <Plus className="size-3.5" />
            </IconButton>
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-medium text-ink hover:border-ink/30"
          >
            <Eye className="size-4" /> Preview
          </button>

          <Menu.Root>
            <Menu.Trigger asChild>
              <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-medium text-ink hover:border-ink/30">
                <Download className="size-4" /> Download <ChevronDown className="size-3.5" />
              </button>
            </Menu.Trigger>
            <MenuContent>
              <Menu.Label className="px-2.5 pt-1.5 pb-1 text-[0.65rem] font-medium tracking-wide text-ink-faint uppercase">This draft</Menu.Label>
              <MenuItem onSelect={() => void download("pdf", true)}>PDF</MenuItem>
              <MenuItem onSelect={() => void download("html", true)}>HTML (works offline)</MenuItem>
              <Menu.Separator className="my-1 h-px bg-line" />
              <Menu.Label className="px-2.5 pt-1.5 pb-1 text-[0.65rem] font-medium tracking-wide text-ink-faint uppercase">What readers see now</Menu.Label>
              <MenuItem onSelect={() => void download("pdf", false)}>PDF</MenuItem>
              <MenuItem onSelect={() => void download("html", false)}>HTML (works offline)</MenuItem>
            </MenuContent>
          </Menu.Root>

          <IconButton label="History" onClick={() => setHistoryOpen(true)}>
            <History className="size-4" />
          </IconButton>

          <Menu.Root>
            <Menu.Trigger asChild>
              <button type="button" aria-label="More" title="More" className="flex size-9 items-center justify-center rounded-full border border-line text-ink hover:border-ink/30">
                <MoreHorizontal className="size-4" />
              </button>
            </Menu.Trigger>
            <MenuContent>
              <MenuItem onSelect={() => setConfirm("rebuild")}>
                <RotateCcw className="size-4" /> Rebuild from the ranges
              </MenuItem>
              <MenuItem onSelect={() => setConfirm("discard")}>
                <Undo2 className="size-4" /> Discard unpublished changes
              </MenuItem>
              {live.designed && (
                <MenuItem onSelect={() => setConfirm("automatic")}>
                  <LayoutList className="size-4" /> Go back to the automatic layout
                </MenuItem>
              )}
              <Menu.Separator className="my-1 h-px bg-line" />
              <MenuItem onSelect={() => router.push("/admin/catalogue/chapters")}>
                <BookOpen className="size-4" /> Chapters &amp; catalogue details
              </MenuItem>
              <MenuItem onSelect={() => window.open("/catalogue/flipbook", "_blank", "noopener")}>
                <Eye className="size-4" /> Open the live flipbook
              </MenuItem>
            </MenuContent>
          </Menu.Root>

          <button
            type="button"
            onClick={() => setConfirm("publish")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-humus-900 px-4 text-sm font-medium text-paper hover:bg-humus-700"
          >
            <Send className="size-4" /> Publish
          </button>
          <IconButton label={panels.inspector ? "Hide settings" : "Show settings"} active={panels.inspector} onClick={() => setPanels((p) => ({ ...p, inspector: !p.inspector }))}>
            <PanelRight className="size-4" />
          </IconButton>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={cn(
            "flex shrink-0 items-center justify-between gap-3 px-4 py-2 text-sm",
            notice.tone === "ok" ? "bg-leaf-200/70 text-leaf-800" : "bg-danger/10 text-danger",
          )}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {panels.pages && (
          <aside className="absolute inset-y-0 left-0 z-20 w-48 shrink-0 border-r border-line bg-cream shadow-card lg:static lg:shadow-none xl:w-52">
            <PagesPanel
              design={design}
              resolved={resolved}
              signatures={signatures}
              selectedId={page.id}
              onSelect={(id) => {
                setPageId(id);
                setBlockId(null);
                setEditingId(null);
              }}
              onMove={(from, to) => {
                checkpoint();
                change((d) => ({ ...d, pages: moveItem(d.pages, from, to) }));
              }}
              onDuplicate={(id) => pageAction(id, "duplicate")}
              onDelete={(id) => pageAction(id, "delete")}
              onToggleHidden={(id) => pageAction(id, "hide")}
              onAdd={() => setAddOpen(true)}
            />
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Insert bar */}
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line bg-paper px-3 py-1.5">
            <Menu.Root>
              <Menu.Trigger asChild>
                <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink hover:bg-paper-dim">
                  <Type className="size-4" /> Text <ChevronDown className="size-3" />
                </button>
              </Menu.Trigger>
              <MenuContent align="start">
                <MenuItem onSelect={() => addText("heading")}>Heading</MenuItem>
                <MenuItem onSelect={() => addText("body")}>Body text</MenuItem>
                <MenuItem onSelect={() => addText("label")}>Small label</MenuItem>
              </MenuContent>
            </Menu.Root>
            <button type="button" onClick={() => setMediaTarget({ kind: "new" })} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink hover:bg-paper-dim">
              <ImageIcon className="size-4" /> Picture
            </button>
            <Menu.Root>
              <Menu.Trigger asChild>
                <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink hover:bg-paper-dim">
                  <Shapes className="size-4" /> Shape <ChevronDown className="size-3" />
                </button>
              </Menu.Trigger>
              <MenuContent align="start">
                <MenuItem onSelect={() => insertBlock(shapeBlock({ shape: "rect", ...center(220, 160) }))}>Rectangle</MenuItem>
                <MenuItem onSelect={() => insertBlock(shapeBlock({ shape: "rect", radius: 999, fill: COLORS.humus900, ...center(220, 44) }))}>Pill</MenuItem>
                <MenuItem onSelect={() => insertBlock(shapeBlock({ shape: "ellipse", ...center(200, 200) }))}>Circle / ellipse</MenuItem>
                <MenuItem onSelect={() => insertBlock(shapeBlock({ shape: "line", fill: null, stroke: COLORS.line, strokeWidth: 2, ...center(400, 12) }))}>Line</MenuItem>
              </MenuContent>
            </Menu.Root>
            <button type="button" onClick={() => insertBlock(buttonBlock({ link: productLink.kind === "product" ? productLink : { kind: "url", href: context.siteUrl }, label: page.productId ? "View product" : "Visit the website", ...(dark ? { background: COLORS.leaf400, color: COLORS.humus950 } : {}), ...center(180, 36) }))} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink hover:bg-paper-dim">
              <MousePointerClick className="size-4" /> Button
            </button>
            <Menu.Root>
              <Menu.Trigger asChild>
                <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink hover:bg-paper-dim">
                  <Square className="size-4" /> Product detail <ChevronDown className="size-3" />
                </button>
              </Menu.Trigger>
              <MenuContent align="start">
                <MenuItem onSelect={() => addField("name")}>Name</MenuItem>
                <MenuItem onSelect={() => addField("description")}>Description</MenuItem>
                <MenuItem onSelect={() => addField("picture")}>Picture</MenuItem>
                <MenuItem onSelect={() => addField("crops")}>Crops</MenuItem>
                <MenuItem onSelect={() => addField("packs")}>Pack sizes</MenuItem>
                <MenuItem onSelect={() => addField("price")}>Price</MenuItem>
                <MenuItem onSelect={() => addField("button")}>&ldquo;View product&rdquo; button</MenuItem>
              </MenuContent>
            </Menu.Root>
            <button type="button" onClick={() => insertBlock(contentsBlock({ x: 42, y: 92, w: 516, h: 520, ...(dark ? { color: COLORS.paper, accent: COLORS.leaf400, muted: `${COLORS.paper}99` } : {}) }))} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink hover:bg-paper-dim">
              <LayoutList className="size-4" /> Contents
            </button>
            <button type="button" onClick={() => insertBlock(qrBlock({ link: productLink.kind === "product" ? productLink : { kind: "url", href: context.siteUrl }, ...center(110, 110) }))} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink hover:bg-paper-dim">
              <QrCode className="size-4" /> QR code
            </button>
            <p className="ml-auto hidden text-[11px] text-ink-faint xl:block">
              Page {pageIndex + 1} of {pageCount} · Del removes · Ctrl+D duplicates · arrows nudge · Alt stops snapping
            </p>
          </div>

          <DesignCanvas
            page={page}
            resolved={resolved[pageIndex] ?? null}
            selectedId={blockId}
            editingId={editingId}
            zoom={zoom}
            onSelect={(id) => {
              setBlockId(id);
              if (id !== editingId) setEditingId(null);
              if (id) setPanels((current) => (window.innerWidth < 1024 ? current : { ...current, inspector: true }));
            }}
            onPatch={patch}
            onStartEditing={(id) => {
              checkpoint();
              setBlockId(id);
              setEditingId(id);
            }}
            onStopEditing={() => setEditingId(null)}
            onText={(id, text) => patch(id, { text } as Partial<Block>, `${id}:inline`)}
            onPickImage={(id) => setMediaTarget({ kind: "block", id })}
          />
        </div>

        {panels.inspector && (
          <aside
            data-lenis-prevent
            className="scrollbar-none absolute inset-y-0 right-0 z-20 w-80 shrink-0 overflow-y-auto border-l border-line bg-cream shadow-card lg:static lg:shadow-none"
          >
            {block ? (
              <BlockInspector
                key={block.id}
                block={block}
                page={page}
                products={products}
                pageCount={pageCount}
                textRef={textRef}
                onPatch={(values, key) => patch(block.id, values, key)}
                onAction={(action) => blockAction(action)}
                onPickImage={() => setMediaTarget({ kind: "block", id: block.id })}
              />
            ) : (
              <PageInspector
                key={page.id}
                page={page}
                products={products}
                onPatch={patchPage}
                onBackground={patchBackground}
                onPickBackground={() => setMediaTarget({ kind: "background" })}
                onSelectBlock={(id) => setBlockId(id)}
                onMoveBlock={(from, to) => {
                  checkpoint();
                  change((d) => mapPage(d, page.id, (p) => ({ ...p, blocks: moveItem(p.blocks, from, to) })));
                }}
                onToggleBlock={(id, field) => {
                  checkpoint();
                  change((d) => mapBlock(d, page.id, id, (b) => ({ ...b, [field]: !b[field] }) as Block));
                }}
              />
            )}
          </aside>
        )}
      </div>

      <MediaDialog
        open={mediaTarget !== null}
        onOpenChange={(open) => !open && setMediaTarget(null)}
        library={library}
        onUploaded={(item) => setLibrary((current) => [item, ...current])}
        onChoose={chooseMedia}
      />

      <AddPageDialog open={addOpen} onOpenChange={setAddOpen} context={context} products={products} onAdd={addPage} />

      {/* History */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          title="History"
          description="Every published version, and drafts that were set aside. Restoring one makes it your draft — nothing changes for readers until you publish."
          className="max-w-xl"
        >
          <ol data-lenis-prevent className="mt-4 max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
            {revisions.length === 0 && <li className="py-6 text-center text-sm text-ink-faint">Nothing yet — publish to start the history.</li>}
            {revisions.map((revision) => (
              <li key={revision.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {revision.note ?? "Saved design"}
                    {revision.version > 0 && <span className="ml-1.5 text-ink-faint">· version {revision.version}</span>}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {formatTime(revision.createdAt)}
                    {revision.actorEmail && ` · ${revision.actorEmail}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirm({ restore: revision })}
                  className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink/30"
                >
                  Restore to draft
                </button>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      {previewOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-label="Preview">
          <Suspense>
            <Flipbook
              pages={previewPages}
              title={title}
              downloads={flipbookDownloads("", { draft: true })}
              onClose={() => setPreviewOpen(false)}
            />
          </Suspense>
        </div>
      )}

      <Confirm
        open={confirm === "publish"}
        title="Publish the flipbook?"
        confirmLabel="Publish"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void doPublish()}
        body={
          <>
            <p>
              Readers will see this design in the flipbook straight away, and the PDF and HTML downloads will be
              made from it.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                {pageCount - hiddenPages} page{pageCount - hiddenPages === 1 ? "" : "s"}
                {hiddenPages > 0 && ` (${hiddenPages} hidden page${hiddenPages === 1 ? "" : "s"} left out)`}
              </li>
              {missingPages > 0 && (
                <li className="text-danger">
                  <AlertTriangle className="mr-1 inline size-3.5" />
                  {missingPages} page{missingPages === 1 ? " presents a product" : "s present products"} no longer
                  listed — {missingPages === 1 ? "it is" : "they are"} left out.
                </li>
              )}
              <li>
                A published design is fixed: a product added to a range later needs a page adding here (or
                &ldquo;Rebuild from the ranges&rdquo;). Product details on the pages stay up to date by themselves.
              </li>
            </ul>
          </>
        }
      />
      <Confirm
        open={confirm === "discard"}
        title="Discard unpublished changes?"
        confirmLabel="Discard"
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void doDiscard()}
        body={<p>The draft goes back to what readers see now. The discarded draft is kept in the history.</p>}
      />
      <Confirm
        open={confirm === "rebuild"}
        title="Rebuild from the ranges?"
        confirmLabel="Rebuild"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void doRebuild()}
        body={
          <p>
            The draft is replaced by a fresh layout: cover, contents, and every range with a page for each of its
            products, in the chapter order. Your current draft is kept in the history, and nothing changes for
            readers until you publish.
          </p>
        }
      />
      <Confirm
        open={confirm === "automatic"}
        title="Go back to the automatic layout?"
        confirmLabel="Use the automatic layout"
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void doAutomatic()}
        body={
          <p>
            Readers get the flipbook laid out automatically from the ranges again, as before any design was
            published. The published design stays in the history.
          </p>
        }
      />
      <Confirm
        open={typeof confirm === "object" && confirm !== null}
        title="Restore this version to the draft?"
        confirmLabel="Restore"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => typeof confirm === "object" && confirm && void doRestore(confirm.restore)}
        body={<p>It replaces the current draft (which is kept in the history). Readers see no change until you publish.</p>}
      />
    </div>
  );
}
