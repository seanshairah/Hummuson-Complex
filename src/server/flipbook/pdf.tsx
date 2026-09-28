import path from "node:path";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import {
  Circle,
  Defs,
  Document,
  Ellipse,
  Font,
  Image as PdfImage,
  Line,
  LinearGradient,
  Link,
  Page,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { PAGE_H, PAGE_W, snapWeight, type FontKey, type Gradient } from "@/lib/flipbook/model";
import type { ResolvedBlock, ResolvedLink, ResolvedPage } from "@/lib/flipbook/resolve";
import { boldWeight } from "@/lib/flipbook/tree";
import { forPdf, loadPictures, type PdfPicture } from "./images";

/**
 * The PDF download: the same resolved pages the flipbook shows, drawn with
 * react-pdf. A page is 420 × 574 pt (the flipbook's 3 : 4.1), so a design
 * unit is 0.7 pt. Links stay live, the contents turn to their pages, and
 * every chapter is a bookmark in the reader's sidebar.
 */

type Style = Exclude<NonNullable<ComponentProps<typeof View>["style"]>, readonly unknown[]>;

const PT = 420;
const S = PT / PAGE_W;
const PAGE_SIZE: [number, number] = [PT, (PAGE_H * PT) / PAGE_W];

const FAMILY: Record<FontKey, string> = {
  display: "FbDisplay",
  sans: "FbSans",
  serif: "FbSerif",
};

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  const dir = (pkg: string) => path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files");
  const file = (pkg: string, weight: number, style: "normal" | "italic") =>
    path.join(dir(pkg), `${pkg}-latin-${weight}-${style}.woff`);

  // Space Grotesk ships 300–700 and no italic: the upright face stands in
  // for italic, and 800 takes the 700.
  const display = [300, 400, 500, 600, 700, 800].flatMap((weight) => {
    const src = file("space-grotesk", Math.min(weight, 700), "normal");
    return [
      { src, fontWeight: weight, fontStyle: "normal" as const },
      { src, fontWeight: weight, fontStyle: "italic" as const },
    ];
  });
  const withItalics = (pkg: string) =>
    [300, 400, 500, 600, 700, 800].flatMap((weight) => [
      { src: file(pkg, weight, "normal"), fontWeight: weight, fontStyle: "normal" as const },
      { src: file(pkg, weight, "italic"), fontWeight: weight, fontStyle: "italic" as const },
    ]);

  Font.register({ family: FAMILY.display, fonts: display });
  Font.register({ family: FAMILY.sans, fonts: withItalics("inter") });
  Font.register({ family: FAMILY.serif, fonts: withItalics("fraunces") });
  // Words are never broken with a hyphen; a catalogue is not a newspaper column.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

/** #rrggbbaa → a colour and an opacity, which is how PDF paints. */
function paint(color: string | null | undefined): { color: string; opacity: number } | null {
  if (!color) return null;
  if (color.length === 9) {
    return { color: color.slice(0, 7), opacity: parseInt(color.slice(7), 16) / 255 };
  }
  return { color, opacity: 1 };
}

const n = (value: number) => Math.round(value * S * 100) / 100;

let gradientSeq = 0;

/**
 * The end points of a CSS-style gradient angle (clockwise from "to top") in
 * bounding-box fractions. react-pdf reads a 0 in x2/y2 as "unset", so exact
 * zeros are nudged off zero.
 */
function gradientLine(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const dx = Math.cos(rad) / 2;
  const dy = Math.sin(rad) / 2;
  const nz = (v: number) => (Math.abs(v) < 1e-4 ? 1e-4 : Math.round(v * 1e4) / 1e4);
  return { x1: nz(0.5 - dx), y1: nz(0.5 - dy), x2: nz(0.5 + dx), y2: nz(0.5 + dy) };
}

function gradientDef(id: string, gradient: Gradient): ReactElement {
  const from = paint(gradient.from)!;
  const to = paint(gradient.to)!;
  return (
    <LinearGradient id={id} {...gradientLine(gradient.angle)}>
      <Stop offset={0} stopColor={from.color} stopOpacity={from.opacity} />
      <Stop offset={1} stopColor={to.color} stopOpacity={to.opacity} />
    </LinearGradient>
  );
}

/** A two-stop gradient filling a w × h box. */
function gradientFill(gradient: Gradient, w: number, h: number): ReactElement {
  const id = `g${(gradientSeq += 1)}`;
  return (
    <Svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
      <Defs>{gradientDef(id, gradient)}</Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${id})`} />
    </Svg>
  );
}

function linkSrc(link: ResolvedLink | null): string | null {
  if (!link) return null;
  return link.kind === "page" ? `#page-${link.page}` : link.href;
}

function frame(block: ResolvedBlock) {
  const style: Style = {
    position: "absolute",
    left: n(block.x),
    top: n(block.y),
    width: n(block.w),
    height: n(block.h),
  };
  if (block.rotate) style.transform = `rotate(${block.rotate}deg)`;
  if (block.opacity < 1) style.opacity = block.opacity;
  return style;
}

/** Positions a block, and makes it a link when it goes somewhere. */
function place(block: ResolvedBlock, style: Style, children: ReactNode) {
  const src = linkSrc(block.href);
  const key = block.id;
  if (!src) {
    return (
      <View key={key} style={style}>
        {children}
      </View>
    );
  }
  return (
    <Link key={key} src={src} style={{ ...style, textDecoration: "none" }}>
      {children}
    </Link>
  );
}

const TEXT_CASE = { none: undefined, upper: "uppercase", lower: "lowercase", title: "capitalize" } as const;

function drawBlock(block: ResolvedBlock, pictures: Map<string, PdfPicture>): ReactElement | null {
  const style = frame(block);
  const w = n(block.w);
  const h = n(block.h);

  switch (block.type) {
    case "text": {
      if (block.background) style.backgroundColor = block.background;
      if (block.radius) style.borderRadius = n(block.radius);
      if (block.padding) style.padding = n(block.padding);
      style.display = "flex";
      style.flexDirection = "column";
      style.justifyContent =
        block.valign === "middle" ? "center" : block.valign === "bottom" ? "flex-end" : "flex-start";
      const size = n(block.size);
      const textStyle: Style = {
        fontFamily: FAMILY[block.font],
        fontSize: size,
        fontWeight: snapWeight(block.weight),
        fontStyle: block.italic ? "italic" : "normal",
        color: block.color,
        textAlign: block.align,
        lineHeight: block.lineHeight,
      };
      if (block.letterSpacing) textStyle.letterSpacing = block.letterSpacing * size;
      if (TEXT_CASE[block.textCase]) textStyle.textTransform = TEXT_CASE[block.textCase];
      if (block.maxLines > 0) {
        textStyle.maxLines = block.maxLines;
        textStyle.textOverflow = "ellipsis";
      }
      const bold = boldWeight(block.weight);
      return place(
        block,
        style,
        <Text style={textStyle}>
          {block.runs.map((run, i) =>
            run.bold ? (
              <Text key={i} style={{ fontWeight: bold }}>
                {run.text}
              </Text>
            ) : (
              run.text
            ),
          )}
        </Text>,
      );
    }

    case "image": {
      style.overflow = "hidden";
      if (block.radius) style.borderRadius = n(block.radius);
      if (block.background) style.backgroundColor = block.background;
      if (block.borderWidth) {
        style.borderWidth = n(block.borderWidth);
        style.borderColor = block.borderColor;
        style.borderStyle = "solid";
      }
      const picture = block.image ? pictures.get(block.image.url) : undefined;
      const inset = block.borderWidth ? n(block.borderWidth) * 2 : 0;
      return place(
        block,
        style,
        <>
          {block.gradient ? gradientFill(block.gradient, w, h) : null}
          {picture ? (
            <PdfImage
              src={{ data: picture.data, format: picture.format }}
              style={{
                width: w - inset,
                height: h - inset,
                objectFit: block.fit,
                objectPositionX: `${block.focusX}%`,
                objectPositionY: `${block.focusY}%`,
              }}
            />
          ) : null}
        </>,
      );
    }

    case "shape": {
      if (block.shape === "line") {
        const line = paint(block.stroke ?? block.fill ?? "#000000")!;
        return place(
          block,
          style,
          <Svg width={w} height={h}>
            <Line
              x1={0}
              y1={h / 2}
              x2={w}
              y2={h / 2}
              stroke={line.color}
              strokeOpacity={line.opacity}
              strokeWidth={Math.max(n(Math.max(block.strokeWidth, 0.5)), 0.2)}
            />
          </Svg>,
        );
      }
      const gradientId = block.gradient ? `g${(gradientSeq += 1)}` : null;
      const fill = paint(block.fill);
      const stroke = block.stroke && block.strokeWidth ? paint(block.stroke) : null;
      const sw = stroke ? n(block.strokeWidth) : 0;
      const props = {
        ...(gradientId
          ? { fill: `url(#${gradientId})` }
          : { fill: fill?.color ?? "none", fillOpacity: fill?.opacity ?? 0 }),
        ...(stroke ? { stroke: stroke.color, strokeOpacity: stroke.opacity, strokeWidth: sw } : {}),
      };
      const r = Math.min(n(block.radius), w / 2, h / 2);
      return place(
        block,
        style,
        <Svg width={w} height={h}>
          {gradientId && block.gradient ? <Defs>{gradientDef(gradientId, block.gradient)}</Defs> : null}
          {block.shape === "ellipse" ? (
            <Ellipse
              cx={w / 2}
              cy={h / 2}
              rx={Math.max(0, w / 2 - sw / 2)}
              ry={Math.max(0, h / 2 - sw / 2)}
              {...props}
            />
          ) : (
            <Rect
              x={sw / 2}
              y={sw / 2}
              width={Math.max(0, w - sw)}
              height={Math.max(0, h - sw)}
              rx={r}
              ry={r}
              {...props}
            />
          )}
        </Svg>,
      );
    }

    case "button": {
      const size = n(block.size);
      Object.assign(style, {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: block.background,
        borderRadius: Math.min(n(block.radius), h / 2),
      });
      if (block.borderColor) {
        style.borderWidth = n(1.5);
        style.borderColor = block.borderColor;
        style.borderStyle = "solid";
      }
      const ink = paint(block.color)!;
      return place(
        block,
        style,
        <>
          <Text
            style={{
              fontFamily: FAMILY[block.font],
              fontSize: size,
              fontWeight: snapWeight(block.weight),
              color: block.color,
              lineHeight: 1.1,
            }}
          >
            {block.labelText}
          </Text>
          {block.arrow ? (
            <Svg width={size} height={size} viewBox="0 0 24 24" style={{ marginLeft: size * 0.45 }}>
              <Path d="M5 12h14" stroke={ink.color} strokeOpacity={ink.opacity} strokeWidth={2} strokeLinecap="round" fill="none" />
              <Path d="M12 5l7 7-7 7" stroke={ink.color} strokeOpacity={ink.opacity} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          ) : null}
        </>,
      );
    }

    case "contents": {
      const size = n(block.size);
      const small = size * 0.74;
      const lead = paint(block.muted)!;
      return (
        <View key={block.id} style={style}>
          {block.entries.map((entry, i) => (
            <Link
              key={entry.page}
              src={`#page-${entry.page}`}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
                marginTop: i === 0 ? 0 : n(block.gap),
                textDecoration: "none",
              }}
            >
              {block.numbered ? (
                <Text style={{ fontFamily: FAMILY[block.font], fontSize: small, fontWeight: 600, color: block.accent, marginRight: size * 0.5, marginBottom: size * 0.06 }}>
                  {String(entry.number).padStart(2, "0")}
                </Text>
              ) : null}
              <Text style={{ fontFamily: FAMILY[block.font], fontSize: size, fontWeight: 500, color: block.color }}>
                {entry.title}
              </Text>
              {block.leader ? (
                <View
                  style={{
                    flexGrow: 1,
                    marginHorizontal: size * 0.8,
                    marginBottom: size * 0.3,
                    borderBottomWidth: n(1.4),
                    borderBottomColor: lead.color,
                    borderBottomStyle: "dotted",
                    opacity: 0.45,
                  }}
                />
              ) : (
                <View style={{ flexGrow: 1 }} />
              )}
              <Text style={{ fontFamily: FAMILY[block.font], fontSize: small, color: block.muted, marginBottom: size * 0.06 }}>
                {String(entry.page)}
              </Text>
            </Link>
          ))}
        </View>
      );
    }

    case "qr": {
      if (block.background) style.backgroundColor = block.background;
      if (!block.qr) return place(block, style, null);
      const ink = paint(block.color)!;
      return place(
        block,
        style,
        <Svg width={w} height={h} viewBox={`0 0 ${block.qr.size} ${block.qr.size}`}>
          <Path d={block.qr.path} fill={ink.color} fillOpacity={ink.opacity} />
        </Svg>,
      );
    }
  }
}

function drawPage(page: ResolvedPage, pictures: Map<string, PdfPicture>): ReactElement {
  const [W, H] = PAGE_SIZE;
  const bg = page.background;
  const ground = paint(bg.color)!;
  const picture = bg.image ? pictures.get(bg.image.url) : undefined;
  const overlay = paint(bg.overlay);

  return (
    <Page
      key={`${page.id}-${page.number}`}
      size={PAGE_SIZE}
      id={`page-${page.number}`}
      bookmark={page.chapter ? { title: page.chapter, fit: true } : undefined}
      style={{ backgroundColor: ground.color, position: "relative" }}
    >
      {bg.gradient ? gradientFill(bg.gradient, W, H) : null}
      {picture ? (
        <PdfImage
          src={{ data: picture.data, format: picture.format }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: W,
            height: H,
            objectFit: bg.imageFit,
            objectPositionX: `${bg.focusX}%`,
            objectPositionY: `${bg.focusY}%`,
            opacity: bg.imageOpacity,
          }}
        />
      ) : null}
      {overlay ? (
        <View style={{ position: "absolute", left: 0, top: 0, width: W, height: H, backgroundColor: bg.overlay! }} />
      ) : null}
      {bg.glow ? (
        // The site's leaf glow: two soft radial pools, top right and bottom left.
        <Svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
          <Defs>
            <RadialGradient id={`glowA${page.number}`} cx={0.5} cy={0.5} r={0.5}>
              <Stop offset={0} stopColor="#84cc35" stopOpacity={0.14} />
              <Stop offset={0.6} stopColor="#84cc35" stopOpacity={0} />
              <Stop offset={1} stopColor="#84cc35" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`glowB${page.number}`} cx={0.5} cy={0.5} r={0.5}>
              <Stop offset={0} stopColor="#2f583b" stopOpacity={0.35} />
              <Stop offset={0.65} stopColor="#2f583b" stopOpacity={0} />
              <Stop offset={1} stopColor="#2f583b" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={W * 0.78} cy={H * 0.12} r={W * 1.2} fill={`url(#glowA${page.number})`} />
          <Circle cx={W * 0.12} cy={H * 0.88} r={W * 1.0} fill={`url(#glowB${page.number})`} />
        </Svg>
      ) : null}
      {page.blocks.map((block) => drawBlock(block, pictures))}
    </Page>
  );
}

export async function renderFlipbookPdf(pages: ResolvedPage[], title: string): Promise<Buffer> {
  registerFonts();
  gradientSeq = 0;
  const urls: string[] = [];
  for (const page of pages) {
    if (page.background.image) urls.push(page.background.image.url);
    for (const block of page.blocks) {
      if (block.type === "image" && block.image) urls.push(block.image.url);
    }
  }
  const pictures = await loadPictures(urls, forPdf);

  const document = (
    <Document title={title} author="Humuson Complex" creator="humusoncomplex.com" producer="humusoncomplex.com" pageMode="useOutlines">
      {pages.map((page) => drawPage(page, pictures))}
    </Document>
  );
  return renderToBuffer(document);
}
