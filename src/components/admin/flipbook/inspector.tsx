"use client";

import { useRef } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import {
  FONT_LABELS,
  FONT_WEIGHTS,
  PAGE_H,
  PAGE_W,
  TOKENS,
  describeBlock,
  type Block,
  type DesignPage,
  type FontKey,
  type Gradient,
  type ImageSource,
  type LinkTarget,
  type PageBackground,
} from "@/lib/flipbook/model";
import { safeHref } from "@/lib/flipbook/schema";
import { cn } from "@/lib/utils";
import {
  ColorInput,
  IconButton,
  NumberInput,
  Row,
  Section,
  Segmented,
  Select,
  TextInput,
  Toggle,
} from "./controls";

export interface ProductOption {
  id: string;
  name: string;
}

export type BlockAction = "delete" | "duplicate" | "front" | "back" | "forward" | "backward";

const FONT_OPTIONS = (Object.keys(FONT_LABELS) as FontKey[]).map((value) => ({
  value,
  label: FONT_LABELS[value],
}));
const WEIGHT_OPTIONS = FONT_WEIGHTS.map((w) => ({
  value: String(w),
  label:
    { 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra bold" }[w] ??
    String(w),
}));

function GradientFields({
  value,
  onChange,
  keyPrefix,
}: {
  value: Gradient | null;
  onChange: (value: Gradient | null, key: string) => void;
  keyPrefix: string;
}) {
  return (
    <>
      <Row label="Gradient">
        <Toggle
          label="Use a gradient"
          checked={Boolean(value)}
          onChange={(on) =>
            onChange(on ? { from: "#eeeadd", to: "#e4dfcd", angle: 135 } : null, `${keyPrefix}:gradient`)
          }
        />
      </Row>
      {value && (
        <>
          <Row label="From">
            <ColorInput label="Gradient start" value={value.from} onChange={(c) => onChange({ ...value, from: c ?? value.from }, `${keyPrefix}:from`)} />
          </Row>
          <Row label="To">
            <ColorInput label="Gradient end" value={value.to} onChange={(c) => onChange({ ...value, to: c ?? value.to }, `${keyPrefix}:to`)} />
          </Row>
          <Row label="Angle">
            <NumberInput label="Gradient angle" value={value.angle} min={-360} max={360} suffix="°" onChange={(angle) => onChange({ ...value, angle }, `${keyPrefix}:angle`)} />
          </Row>
        </>
      )}
    </>
  );
}

function LinkFields({
  link,
  onChange,
  pageCount,
  hasProduct,
}: {
  link: LinkTarget;
  onChange: (link: LinkTarget, key: string) => void;
  pageCount: number;
  hasProduct: boolean;
}) {
  const invalid = link.kind === "url" && !safeHref(link.href);
  return (
    <>
      <Row label="Goes to">
        <Select
          label="Link"
          value={link.kind}
          onChange={(kind) => {
            if (kind === "none") onChange({ kind: "none" }, "link:kind");
            if (kind === "product") onChange({ kind: "product" }, "link:kind");
            if (kind === "url") onChange({ kind: "url", href: "https://" }, "link:kind");
            if (kind === "page") onChange({ kind: "page", page: 2 }, "link:kind");
          }}
          options={[
            { value: "none", label: "Nothing" },
            { value: "product", label: "The product's page on the site" },
            { value: "url", label: "A web address" },
            { value: "page", label: "A page of this flipbook" },
          ]}
        />
      </Row>
      {link.kind === "product" && !hasProduct && (
        <p className="text-xs text-soil-600">Choose a product for this block or its page.</p>
      )}
      {link.kind === "url" && (
        <Row label="Address">
          <TextInput label="Web address" value={link.href} placeholder="https://… or /products/…" onChange={(href) => onChange({ kind: "url", href }, "link:href")} />
          {invalid && (
            <p className="mt-1 text-[11px] text-danger">
              Use https://…, mailto:, tel: or a site path like /products.
            </p>
          )}
        </Row>
      )}
      {link.kind === "page" && (
        <Row label="Page">
          <NumberInput label="Page number" value={link.page} min={1} max={Math.max(1, pageCount)} onChange={(page) => onChange({ kind: "page", page: Math.round(page) }, "link:page")} />
        </Row>
      )}
    </>
  );
}

function ProductField({
  value,
  onChange,
  products,
  emptyLabel,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  products: ProductOption[];
  emptyLabel: string;
}) {
  const known = !value || products.some((p) => p.id === value);
  return (
    <>
      <Combobox
        label="Product"
        value={value ?? ""}
        onChange={(v) => onChange(v || null)}
        options={[{ value: "", label: emptyLabel }, ...products.map((p) => ({ value: p.id, label: p.name }))]}
        placeholder={emptyLabel}
        searchPlaceholder="Search products…"
        className="h-8 text-xs"
      />
      {!known && <p className="mt-1 text-[11px] text-danger">That product is no longer listed.</p>}
    </>
  );
}

function ImageSourceFields({
  source,
  onChange,
  onPick,
  allowEmpty,
}: {
  source: ImageSource | null;
  onChange: (source: ImageSource | null, key: string) => void;
  onPick: () => void;
  allowEmpty: boolean;
}) {
  const kind = source?.kind ?? "none";
  return (
    <>
      <Row label="Picture">
        <Select
          label="Picture source"
          value={kind === "product" ? `product:${(source as { which: string }).which}` : kind}
          onChange={(value) => {
            if (value === "none") onChange(null, "src");
            if (value === "media") onPick();
            if (value === "product:catalogue") onChange({ kind: "product", which: "catalogue" }, "src");
            if (value === "product:primary") onChange({ kind: "product", which: "primary" }, "src");
          }}
          options={[
            ...(allowEmpty ? [{ value: "none", label: "None" }] : []),
            { value: "media", label: "From the media library" },
            { value: "product:catalogue", label: "Product · catalogue picture" },
            { value: "product:primary", label: "Product · main photo" },
          ]}
        />
      </Row>
      {source?.kind === "media" && (
        <button
          type="button"
          onClick={onPick}
          className="flex w-full items-center gap-2 rounded-lg border border-line bg-cream px-2 py-1.5 text-left text-xs text-ink-soft hover:border-ink/30"
        >
          <ImagePlus className="size-3.5 shrink-0" />
          <span className="truncate">{source.url ? source.url.split("/").pop() : "Choose a picture…"}</span>
        </button>
      )}
    </>
  );
}

/* ── Block ──────────────────────────────────────────────────────────────── */

export function BlockInspector({
  block,
  page,
  products,
  pageCount,
  onPatch,
  onAction,
  onPickImage,
  textRef,
}: {
  block: Block;
  page: DesignPage;
  products: ProductOption[];
  pageCount: number;
  onPatch: (patch: Partial<Block>, key: string) => void;
  onAction: (action: BlockAction) => void;
  onPickImage: () => void;
  textRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const localText = useRef<HTMLTextAreaElement | null>(null);
  const area = textRef ?? localText;
  const hasProduct = Boolean(block.productId ?? page.productId);

  const insertToken = (token: string) => {
    if (block.type !== "text" && block.type !== "button") return;
    const field = block.type === "text" ? "text" : "label";
    const current = block.type === "text" ? block.text : block.label;
    const el = block.type === "text" ? area.current : null;
    const at = el ? el.selectionStart : current.length;
    const end = el ? el.selectionEnd : current.length;
    const next = current.slice(0, at) + token + current.slice(end);
    onPatch({ [field]: next } as Partial<Block>, `${block.id}:${field}:token`);
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(at + token.length, at + token.length);
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="min-w-0 truncate font-display text-sm font-medium text-ink">{describeBlock(block)}</p>
        <div className="flex items-center">
          <IconButton label="Duplicate (Ctrl+D)" onClick={() => onAction("duplicate")}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton label="Delete (Del)" onClick={() => onAction("delete")}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      {block.type === "text" && (
        <Section title="Text">
          <textarea
            ref={area}
            aria-label="Text"
            rows={4}
            value={block.text}
            onChange={(e) => onPatch({ text: e.target.value } as Partial<Block>, `${block.id}:text`)}
            className="w-full resize-y rounded-lg border border-line bg-cream p-2 text-sm text-ink outline-none focus:border-leaf-600"
          />
          <div className="flex items-center gap-2">
            <select
              aria-label="Insert a field"
              value=""
              onChange={(e) => e.target.value && insertToken(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-cream px-2 text-xs text-ink-soft"
            >
              <option value="">Insert a field…</option>
              {TOKENS.map((t) => (
                <option key={t.token} value={t.token}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] leading-snug text-ink-faint">
            <code>**like this**</code> sets words in bold. Fields such as <code>{"{{name}}"}</code> fill in from the
            product and catalogue.
          </p>
          <Row label="Font">
            <Select label="Font" value={block.font} onChange={(font) => onPatch({ font } as Partial<Block>, `${block.id}:font`)} options={FONT_OPTIONS} />
          </Row>
          <Row label="Size · weight">
            <div className="grid grid-cols-2 gap-1.5">
              <NumberInput label="Font size" value={block.size} min={4} max={200} step={0.5} onChange={(size) => onPatch({ size } as Partial<Block>, `${block.id}:size`)} />
              <Select label="Weight" value={String(block.weight)} onChange={(v) => onPatch({ weight: Number(v) } as Partial<Block>, `${block.id}:weight`)} options={WEIGHT_OPTIONS} />
            </div>
          </Row>
          <Row label="Colour">
            <ColorInput label="Text colour" value={block.color} onChange={(c) => onPatch({ color: c ?? block.color } as Partial<Block>, `${block.id}:color`)} />
          </Row>
          <Row label="Align">
            <Segmented
              label="Alignment"
              value={block.align}
              onChange={(align) => onPatch({ align } as Partial<Block>, `${block.id}:align`)}
              options={[
                { value: "left", label: <AlignLeft className="size-3.5" />, title: "Left" },
                { value: "center", label: <AlignCenter className="size-3.5" />, title: "Centre" },
                { value: "right", label: <AlignRight className="size-3.5" />, title: "Right" },
                { value: "justify", label: <AlignJustify className="size-3.5" />, title: "Justify" },
              ]}
            />
          </Row>
          <Row label="Vertical">
            <Segmented
              label="Vertical alignment"
              value={block.valign}
              onChange={(valign) => onPatch({ valign } as Partial<Block>, `${block.id}:valign`)}
              options={[
                { value: "top", label: "Top" },
                { value: "middle", label: "Middle" },
                { value: "bottom", label: "Bottom" },
              ]}
            />
          </Row>
          <Row label="Style">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                <Toggle label="Italic" checked={block.italic} onChange={(italic) => onPatch({ italic } as Partial<Block>, `${block.id}:italic`)} />
                Italic
              </label>
              <Select
                label="Letter case"
                value={block.textCase}
                onChange={(textCase) => onPatch({ textCase } as Partial<Block>, `${block.id}:case`)}
                options={[
                  { value: "none", label: "As typed" },
                  { value: "upper", label: "UPPERCASE" },
                  { value: "lower", label: "lowercase" },
                  { value: "title", label: "Title Case" },
                ]}
              />
            </div>
          </Row>
          <Row label="Line · spacing">
            <div className="grid grid-cols-2 gap-1.5">
              <NumberInput label="Line height" value={block.lineHeight} min={0.7} max={3} step={0.05} onChange={(lineHeight) => onPatch({ lineHeight } as Partial<Block>, `${block.id}:lh`)} />
              <NumberInput label="Letter spacing" value={block.letterSpacing} min={-0.2} max={1} step={0.01} suffix="em" onChange={(letterSpacing) => onPatch({ letterSpacing } as Partial<Block>, `${block.id}:ls`)} />
            </div>
          </Row>
          <Row label="Max lines" hint="Cut the text off after this many lines, with an ellipsis. 0 shows it all.">
            <NumberInput label="Maximum lines" value={block.maxLines} min={0} max={60} onChange={(maxLines) => onPatch({ maxLines: Math.round(maxLines) } as Partial<Block>, `${block.id}:max`)} />
          </Row>
          <Row label="Hide if empty" hint="Hide this text when its fields have nothing to show — a product with no pack sizes, say.">
            <Toggle label="Hide when empty" checked={block.hideIfEmpty} onChange={(hideIfEmpty) => onPatch({ hideIfEmpty } as Partial<Block>, `${block.id}:hide-empty`)} />
          </Row>
          <Row label="Background">
            <ColorInput nullable label="Text background" value={block.background} onChange={(background) => onPatch({ background } as Partial<Block>, `${block.id}:bg`)} />
          </Row>
          <Row label="Padding · round">
            <div className="grid grid-cols-2 gap-1.5">
              <NumberInput label="Padding" value={block.padding} min={0} max={200} onChange={(padding) => onPatch({ padding } as Partial<Block>, `${block.id}:pad`)} />
              <NumberInput label="Corner radius" value={block.radius} min={0} max={999} onChange={(radius) => onPatch({ radius } as Partial<Block>, `${block.id}:radius`)} />
            </div>
          </Row>
        </Section>
      )}

      {block.type === "image" && (
        <Section title="Picture">
          <ImageSourceFields
            source={block.src}
            allowEmpty={false}
            onPick={onPickImage}
            onChange={(src, key) => src && onPatch({ src } as Partial<Block>, `${block.id}:${key}`)}
          />
          <Row label="Fit">
            <Segmented
              label="Fit"
              value={block.fit}
              onChange={(fit) => onPatch({ fit } as Partial<Block>, `${block.id}:fit`)}
              options={[
                { value: "cover", label: "Fill the frame" },
                { value: "contain", label: "Show it all" },
              ]}
            />
          </Row>
          <Row label="Focus" hint="Which part of the picture stays in view when it is cropped (0–100 across, down).">
            <div className="grid grid-cols-2 gap-1.5">
              <NumberInput label="Focus across" value={block.focusX} min={0} max={100} suffix="%" onChange={(focusX) => onPatch({ focusX } as Partial<Block>, `${block.id}:fx`)} />
              <NumberInput label="Focus down" value={block.focusY} min={0} max={100} suffix="%" onChange={(focusY) => onPatch({ focusY } as Partial<Block>, `${block.id}:fy`)} />
            </div>
          </Row>
          <Row label="Corners">
            <NumberInput label="Corner radius" value={block.radius} min={0} max={999} onChange={(radius) => onPatch({ radius } as Partial<Block>, `${block.id}:radius`)} />
          </Row>
          <Row label="Border">
            <div className="grid grid-cols-[4rem_1fr] gap-1.5">
              <NumberInput label="Border width" value={block.borderWidth} min={0} max={60} onChange={(borderWidth) => onPatch({ borderWidth } as Partial<Block>, `${block.id}:bw`)} />
              <ColorInput label="Border colour" value={block.borderColor} onChange={(c) => onPatch({ borderColor: c ?? block.borderColor } as Partial<Block>, `${block.id}:bc`)} />
            </div>
          </Row>
          <Row label="Behind">
            <ColorInput nullable label="Colour behind the picture" value={block.background} onChange={(background) => onPatch({ background } as Partial<Block>, `${block.id}:bg`)} />
          </Row>
          <GradientFields value={block.gradient} keyPrefix={block.id} onChange={(gradient, key) => onPatch({ gradient } as Partial<Block>, key)} />
        </Section>
      )}

      {block.type === "shape" && (
        <Section title="Shape">
          <Row label="Shape">
            <Segmented
              label="Shape"
              value={block.shape}
              onChange={(shape) => onPatch({ shape } as Partial<Block>, `${block.id}:shape`)}
              options={[
                { value: "rect", label: "Rectangle" },
                { value: "ellipse", label: "Ellipse" },
                { value: "line", label: "Line" },
              ]}
            />
          </Row>
          {block.shape !== "line" && (
            <>
              <Row label="Fill">
                <ColorInput nullable label="Fill" value={block.fill} onChange={(fill) => onPatch({ fill } as Partial<Block>, `${block.id}:fill`)} />
              </Row>
              <GradientFields value={block.gradient} keyPrefix={block.id} onChange={(gradient, key) => onPatch({ gradient } as Partial<Block>, key)} />
            </>
          )}
          <Row label={block.shape === "line" ? "Line" : "Outline"}>
            <div className="grid grid-cols-[4rem_1fr] gap-1.5">
              <NumberInput label="Thickness" value={block.strokeWidth} min={0} max={60} step={0.5} onChange={(strokeWidth) => onPatch({ strokeWidth } as Partial<Block>, `${block.id}:sw`)} />
              <ColorInput nullable label="Line colour" value={block.stroke} onChange={(stroke) => onPatch({ stroke } as Partial<Block>, `${block.id}:stroke`)} />
            </div>
          </Row>
          {block.shape === "rect" && (
            <Row label="Corners">
              <NumberInput label="Corner radius" value={block.radius} min={0} max={999} onChange={(radius) => onPatch({ radius } as Partial<Block>, `${block.id}:radius`)} />
            </Row>
          )}
        </Section>
      )}

      {block.type === "button" && (
        <Section title="Button">
          <Row label="Label">
            <TextInput label="Button label" value={block.label} onChange={(label) => onPatch({ label } as Partial<Block>, `${block.id}:label`)} />
          </Row>
          <Row label="Font">
            <Select label="Font" value={block.font} onChange={(font) => onPatch({ font } as Partial<Block>, `${block.id}:font`)} options={FONT_OPTIONS} />
          </Row>
          <Row label="Size · weight">
            <div className="grid grid-cols-2 gap-1.5">
              <NumberInput label="Font size" value={block.size} min={4} max={120} step={0.5} onChange={(size) => onPatch({ size } as Partial<Block>, `${block.id}:size`)} />
              <Select label="Weight" value={String(block.weight)} onChange={(v) => onPatch({ weight: Number(v) } as Partial<Block>, `${block.id}:weight`)} options={WEIGHT_OPTIONS} />
            </div>
          </Row>
          <Row label="Text colour">
            <ColorInput label="Label colour" value={block.color} onChange={(c) => onPatch({ color: c ?? block.color } as Partial<Block>, `${block.id}:color`)} />
          </Row>
          <Row label="Button colour">
            <ColorInput label="Button colour" value={block.background} onChange={(c) => onPatch({ background: c ?? block.background } as Partial<Block>, `${block.id}:bg`)} />
          </Row>
          <Row label="Outline">
            <ColorInput nullable label="Outline colour" value={block.borderColor} onChange={(borderColor) => onPatch({ borderColor } as Partial<Block>, `${block.id}:border`)} />
          </Row>
          <Row label="Corners">
            <NumberInput label="Corner radius" value={block.radius} min={0} max={999} onChange={(radius) => onPatch({ radius } as Partial<Block>, `${block.id}:radius`)} />
          </Row>
          <Row label="Arrow">
            <Toggle label="Show an arrow" checked={block.arrow} onChange={(arrow) => onPatch({ arrow } as Partial<Block>, `${block.id}:arrow`)} />
          </Row>
        </Section>
      )}

      {block.type === "contents" && (
        <Section title="Contents">
          <p className="text-[11px] leading-snug text-ink-faint">
            Lists every page that starts a chapter, with its page number. Set a page&rsquo;s chapter in its page
            settings.
          </p>
          <Row label="Font">
            <Select label="Font" value={block.font} onChange={(font) => onPatch({ font } as Partial<Block>, `${block.id}:font`)} options={FONT_OPTIONS} />
          </Row>
          <Row label="Size · gap">
            <div className="grid grid-cols-2 gap-1.5">
              <NumberInput label="Font size" value={block.size} min={4} max={120} step={0.5} onChange={(size) => onPatch({ size } as Partial<Block>, `${block.id}:size`)} />
              <NumberInput label="Space between" value={block.gap} min={0} max={200} onChange={(gap) => onPatch({ gap } as Partial<Block>, `${block.id}:gap`)} />
            </div>
          </Row>
          <Row label="Titles">
            <ColorInput label="Title colour" value={block.color} onChange={(c) => onPatch({ color: c ?? block.color } as Partial<Block>, `${block.id}:color`)} />
          </Row>
          <Row label="Numbers">
            <ColorInput label="Number colour" value={block.accent} onChange={(c) => onPatch({ accent: c ?? block.accent } as Partial<Block>, `${block.id}:accent`)} />
          </Row>
          <Row label="Pages">
            <ColorInput label="Page number colour" value={block.muted} onChange={(c) => onPatch({ muted: c ?? block.muted } as Partial<Block>, `${block.id}:muted`)} />
          </Row>
          <Row label="Numbered">
            <Toggle label="Number the chapters" checked={block.numbered} onChange={(numbered) => onPatch({ numbered } as Partial<Block>, `${block.id}:numbered`)} />
          </Row>
          <Row label="Dotted leader">
            <Toggle label="Dotted leader" checked={block.leader} onChange={(leader) => onPatch({ leader } as Partial<Block>, `${block.id}:leader`)} />
          </Row>
        </Section>
      )}

      {block.type === "qr" && (
        <Section title="QR code">
          <p className="text-[11px] leading-snug text-ink-faint">
            Encodes where the block links to (below) — scanning it from a printed page opens that address.
          </p>
          <Row label="Colour">
            <ColorInput label="Code colour" value={block.color} onChange={(c) => onPatch({ color: c ?? block.color } as Partial<Block>, `${block.id}:color`)} />
          </Row>
          <Row label="Background">
            <ColorInput nullable label="Background" value={block.background} onChange={(background) => onPatch({ background } as Partial<Block>, `${block.id}:bg`)} />
          </Row>
        </Section>
      )}

      {(block.type === "text" || block.type === "button") && (
        <div className="-mt-2 px-4 pb-3">
          {block.type === "button" && (
            <select
              aria-label="Insert a field into the label"
              value=""
              onChange={(e) => e.target.value && insertToken(e.target.value)}
              className="h-8 w-full rounded-lg border border-line bg-cream px-2 text-xs text-ink-soft"
            >
              <option value="">Insert a field into the label…</option>
              {TOKENS.map((t) => (
                <option key={t.token} value={t.token}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {block.type !== "contents" && (
        <Section title="Link">
          <LinkFields
            link={block.link}
            pageCount={pageCount}
            hasProduct={hasProduct}
            onChange={(link, key) => onPatch({ link } as Partial<Block>, `${block.id}:${key}`)}
          />
        </Section>
      )}

      <Section title="Product">
        <ProductField
          value={block.productId}
          products={products}
          emptyLabel={page.productId ? "Same as the page" : "No product"}
          onChange={(productId) => onPatch({ productId } as Partial<Block>, `${block.id}:product`)}
        />
        <p className="text-[11px] leading-snug text-ink-faint">
          The product this block&rsquo;s fields, picture and link come from.
        </p>
      </Section>

      <Section title="Position and size">
        <div className="grid grid-cols-2 gap-1.5">
          <NumberInput label="Left" value={block.x} suffix="x" onChange={(x) => onPatch({ x }, `${block.id}:x`)} />
          <NumberInput label="Top" value={block.y} suffix="y" onChange={(y) => onPatch({ y }, `${block.id}:y`)} />
          <NumberInput label="Width" value={block.w} min={1} suffix="w" onChange={(w) => onPatch({ w }, `${block.id}:w`)} />
          <NumberInput label="Height" value={block.h} min={1} suffix="h" onChange={(h) => onPatch({ h }, `${block.id}:h`)} />
          <NumberInput label="Rotation" value={block.rotate} min={-360} max={360} suffix="°" onChange={(rotate) => onPatch({ rotate }, `${block.id}:rotate`)} />
          <NumberInput label="Opacity" value={Math.round(block.opacity * 100)} min={0} max={100} suffix="%" onChange={(o) => onPatch({ opacity: o / 100 }, `${block.id}:opacity`)} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPatch({ x: Math.round(((PAGE_W - block.w) / 2) * 10) / 10 }, `${block.id}:center-x`)}
            className="flex-1 rounded-lg border border-line py-1.5 text-xs text-ink-soft hover:border-ink/30"
          >
            Centre across
          </button>
          <button
            type="button"
            onClick={() => onPatch({ y: Math.round(((PAGE_H - block.h) / 2) * 10) / 10 }, `${block.id}:center-y`)}
            className="flex-1 rounded-lg border border-line py-1.5 text-xs text-ink-soft hover:border-ink/30"
          >
            Centre down
          </button>
        </div>
        <p className="text-[11px] text-ink-faint">The page is {PAGE_W} wide and {PAGE_H} tall.</p>
        <div className="flex flex-wrap items-center gap-1">
          <IconButton label="Bring to front" onClick={() => onAction("front")}>
            <ArrowUpToLine className="size-4" />
          </IconButton>
          <IconButton label="Bring forward (])" onClick={() => onAction("forward")}>
            <ArrowUp className="size-4" />
          </IconButton>
          <IconButton label="Send backward ([)" onClick={() => onAction("backward")}>
            <ArrowDown className="size-4" />
          </IconButton>
          <IconButton label="Send to back" onClick={() => onAction("back")}>
            <ArrowDownToLine className="size-4" />
          </IconButton>
          <span className="mx-1 h-5 w-px bg-line" />
          <IconButton label={block.locked ? "Unlock" : "Lock in place"} active={block.locked} onClick={() => onPatch({ locked: !block.locked }, `${block.id}:lock`)}>
            {block.locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
          </IconButton>
          <IconButton label={block.hidden ? "Show" : "Hide"} active={block.hidden} onClick={() => onPatch({ hidden: !block.hidden }, `${block.id}:hidden`)}>
            {block.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </IconButton>
        </div>
        <Row label="Layer name">
          <TextInput label="Layer name" value={block.name ?? ""} placeholder={describeBlock({ ...block, name: null })} onChange={(name) => onPatch({ name: name || null }, `${block.id}:name`)} />
        </Row>
      </Section>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export function PageInspector({
  page,
  products,
  onPatch,
  onBackground,
  onPickBackground,
  onSelectBlock,
  onMoveBlock,
  onToggleBlock,
}: {
  page: DesignPage;
  products: ProductOption[];
  onPatch: (patch: Partial<DesignPage>, key: string) => void;
  onBackground: (patch: Partial<PageBackground>, key: string) => void;
  onPickBackground: () => void;
  onSelectBlock: (id: string) => void;
  onMoveBlock: (from: number, to: number) => void;
  onToggleBlock: (id: string, field: "hidden" | "locked") => void;
}) {
  const bg = page.background;
  return (
    <div>
      <Section title="Page">
        <Row label="Name">
          <TextInput label="Page name" value={page.name} onChange={(name) => onPatch({ name }, `${page.id}:name`)} />
        </Row>
        <Row label="Chapter" hint="A page that starts a chapter is listed in the contents, and {{chapter}} reads its title.">
          <Toggle label="Starts a chapter" checked={page.chapter !== null} onChange={(on) => onPatch({ chapter: on ? page.name || "Chapter" : null }, `${page.id}:chapter-on`)} />
        </Row>
        {page.chapter !== null && (
          <Row label="Chapter title">
            <TextInput label="Chapter title" value={page.chapter} onChange={(chapter) => onPatch({ chapter }, `${page.id}:chapter`)} />
          </Row>
        )}
        <Row label="Product" hint="Fields like {{name}} on this page read this product.">
          <ProductField value={page.productId} products={products} emptyLabel="No product" onChange={(productId) => onPatch({ productId }, `${page.id}:product`)} />
        </Row>
        <Row label="Hidden" hint="Kept in the design, left out of the flipbook and the downloads.">
          <Toggle label="Hide this page" checked={page.hidden} onChange={(hidden) => onPatch({ hidden }, `${page.id}:hidden`)} />
        </Row>
      </Section>

      <Section title="Background">
        <Row label="Colour">
          <ColorInput label="Background colour" value={bg.color} onChange={(color) => onBackground({ color: color ?? bg.color }, `${page.id}:bg-color`)} />
        </Row>
        <GradientFields value={bg.gradient} keyPrefix={`${page.id}:bg`} onChange={(gradient, key) => onBackground({ gradient }, key)} />
        <ImageSourceFields source={bg.image} allowEmpty onPick={onPickBackground} onChange={(image, key) => onBackground({ image }, `${page.id}:bg-${key}`)} />
        {bg.image && (
          <>
            <Row label="Fit">
              <Segmented label="Fit" value={bg.imageFit} onChange={(imageFit) => onBackground({ imageFit }, `${page.id}:bg-fit`)} options={[{ value: "cover", label: "Fill the page" }, { value: "contain", label: "Show it all" }]} />
            </Row>
            <Row label="Opacity">
              <NumberInput label="Picture opacity" value={Math.round(bg.imageOpacity * 100)} min={0} max={100} suffix="%" onChange={(o) => onBackground({ imageOpacity: o / 100 }, `${page.id}:bg-opacity`)} />
            </Row>
            <Row label="Focus">
              <div className="grid grid-cols-2 gap-1.5">
                <NumberInput label="Focus across" value={bg.focusX} min={0} max={100} suffix="%" onChange={(focusX) => onBackground({ focusX }, `${page.id}:bg-fx`)} />
                <NumberInput label="Focus down" value={bg.focusY} min={0} max={100} suffix="%" onChange={(focusY) => onBackground({ focusY }, `${page.id}:bg-fy`)} />
              </div>
            </Row>
          </>
        )}
        <Row label="Tint">
          <ColorInput nullable label="Tint over the picture" value={bg.overlay} onChange={(overlay) => onBackground({ overlay }, `${page.id}:bg-overlay`)} />
        </Row>
        <Row label="Grain">
          <Toggle label="Film grain" checked={bg.grain} onChange={(grain) => onBackground({ grain }, `${page.id}:bg-grain`)} />
        </Row>
        <Row label="Leaf glow">
          <Toggle label="Leaf glow" checked={bg.glow} onChange={(glow) => onBackground({ glow }, `${page.id}:bg-glow`)} />
        </Row>
      </Section>

      <Section title={`Layers · ${page.blocks.length}`}>
        {page.blocks.length === 0 ? (
          <p className="text-xs text-ink-faint">Nothing on this page yet — add text, pictures or shapes from the bar above the page.</p>
        ) : (
          <ol className="space-y-1">
            {[...page.blocks]
              .map((block, index) => ({ block, index }))
              .reverse()
              .map(({ block, index }) => (
                <li key={block.id} className="group flex items-center gap-1 rounded-lg border border-transparent px-1 hover:border-line">
                  <button type="button" onClick={() => onSelectBlock(block.id)} className={cn("min-w-0 flex-1 truncate py-1.5 text-left text-xs", block.hidden ? "text-ink-faint line-through" : "text-ink")}>
                    {describeBlock(block)}
                  </button>
                  <IconButton label="Forward" onClick={() => onMoveBlock(index, index + 1)} disabled={index === page.blocks.length - 1} className="size-6 opacity-0 group-hover:opacity-100">
                    <ArrowUp className="size-3.5" />
                  </IconButton>
                  <IconButton label="Backward" onClick={() => onMoveBlock(index, index - 1)} disabled={index === 0} className="size-6 opacity-0 group-hover:opacity-100">
                    <ArrowDown className="size-3.5" />
                  </IconButton>
                  <IconButton label={block.locked ? "Unlock" : "Lock"} onClick={() => onToggleBlock(block.id, "locked")} className={cn("size-6", !block.locked && "opacity-0 group-hover:opacity-100")}>
                    {block.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                  </IconButton>
                  <IconButton label={block.hidden ? "Show" : "Hide"} onClick={() => onToggleBlock(block.id, "hidden")} className={cn("size-6", !block.hidden && "opacity-0 group-hover:opacity-100")}>
                    {block.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </IconButton>
                </li>
              ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
