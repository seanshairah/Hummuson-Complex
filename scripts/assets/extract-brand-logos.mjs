/**
 * Rebuild the partner logos in `public/images/brand/` from the product
 * photographs they were lifted out of.
 *
 * Humuson never received press kits for IKAR, Nando or Arvensis — the only
 * artwork we hold for them is whatever happens to be printed on a pack in the
 * catalogue photos. So the marks are cropped out of those photos, and this
 * script is the record of *which* photo and *which* pixels, so a better source
 * (a press kit, a sharper photo) means editing a crop box rather than guessing
 * in an image editor.
 *
 * Run with `npm run assets:logos`. It is not part of the build: the outputs are
 * committed, because the product photos they depend on are committed too and
 * neither changes without someone deciding it should.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_DIR = path.join(ROOT, "public/images/brand");

/**
 * `crop` is in the source photo's own pixels. `height` is the height the
 * finished file is written at — the two logos that shipped with the site are
 * 116px and 960px tall, so anything in that range sits beside them without the
 * browser having to guess.
 *
 * `paper` says how the background behind the mark has to be treated:
 *
 *   "flat"  — a photographed label, lit unevenly and tinted by whatever light
 *             it was shot under. Needs the full flat-field correction below.
 *   "clean" — printed artwork that was already square-on, evenly lit and white.
 *             A gentle stretch is all it wants; the flat-field would wreck it
 *             (see `flatField`).
 */
const LOGOS = [
  {
    file: "partner-ikar.png",
    label: "IKAR",
    source: "public/images/products/ocean/1.jpg",
    crop: { left: 492, top: 800, width: 216, height: 224 },
    paper: "clean",
    height: 448,
  },
  {
    file: "partner-nando.png",
    label: "Nando",
    source: "public/images/products/bio-npk-powder-s/1.jpg",
    crop: { left: 433, top: 585, width: 90, height: 44 },
    paper: "flat",
    height: 176,
  },
  {
    file: "partner-arvensis.png",
    label: "Arvensis Agro",
    source: "public/images/products/fortik-solid/wa-back.jpg",
    crop: { left: 100, top: 319, width: 91, height: 34 },
    paper: "flat",
    height: 132,
  },
];

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Largest value within `r` pixels, run over rows then columns. */
function maxFilter(src, w, h, r) {
  const pass = (input) => {
    const out = new Float32Array(input.length);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let m = 0;
        for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k += 1) {
          const v = input[y * w + k];
          if (v > m) m = v;
        }
        out[y * w + x] = m;
      }
    }
    return out;
  };
  const rows = pass(src);
  // Transpose-free vertical pass.
  const out = new Float32Array(src.length);
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) {
      let m = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k += 1) {
        const v = rows[k * w + x];
        if (v > m) m = v;
      }
      out[y * w + x] = m;
    }
  }
  return out;
}

/** Mean within `r` pixels, same separable shape, to take the steps out. */
function boxBlur(src, w, h, r) {
  const rows = new Float32Array(src.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let sum = 0;
      let n = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k += 1, n += 1) {
        sum += src[y * w + k];
      }
      rows[y * w + x] = sum / n;
    }
  }
  const out = new Float32Array(src.length);
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) {
      let sum = 0;
      let n = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k += 1, n += 1) {
        sum += rows[k * w + x];
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

/**
 * Divide the crop by its own illumination so the paper comes out white
 * everywhere at once.
 *
 * A single white point cannot do this: the Nando bag is lit brightly at the top
 * of the wordmark and falls into shadow at the bottom edge, so whatever level
 * clears the shadow blows out the top. Estimating the paper per pixel — the
 * brightest value nearby, smoothed — and dividing by it flattens the gradient
 * and the colour cast together.
 *
 * It only works while the ink is small relative to `r`. Over a big block of
 * solid colour the "brightest value nearby" is the colour itself, and dividing
 * by it turns the block white — which is exactly what would happen to IKAR's
 * wing, and why that one is marked "clean" instead.
 */
function flatField(data, w, h, channels) {
  const r = Math.max(5, Math.round(Math.min(w, h) / 4));
  const out = Buffer.alloc(w * h * channels);
  for (let c = 0; c < channels; c += 1) {
    const plane = new Float32Array(w * h);
    for (let i = 0; i < w * h; i += 1) plane[i] = data[i * channels + c];
    const paper = boxBlur(maxFilter(plane, w, h, r), w, h, r);
    for (let i = 0; i < w * h; i += 1) {
      out[i * channels + c] = clamp(Math.round((plane[i] / Math.max(1, paper[i])) * 255));
    }
  }
  return out;
}

/**
 * Settle the paper down to one flat white.
 *
 * Dividing per channel amplifies the chroma noise a phone camera and a JPEG
 * leave behind, so a background that looked evenly off-white comes out of
 * `flatField` faintly mottled pink and green. Pixels that are already both
 * bright and nearly grey are paper by definition, so they get pulled the rest
 * of the way to white on a ramp — gradual, so antialiased glyph edges are only
 * lightly touched and no halo appears around the mark.
 *
 * The saturation half of the gate is what keeps IKAR's yellow wing: it is as
 * bright as paper, and only its colour says otherwise.
 */
function paperToWhite(data, w, h, channels) {
  const ramp = (v, lo, hi) => (v <= lo ? 0 : v >= hi ? 1 : (v - lo) / (hi - lo));
  for (let i = 0; i < w * h; i += 1) {
    const o = i * channels;
    const [r, g, b] = [data[o], data[o + 1], data[o + 2]];
    const max = Math.max(r, g, b);
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    const weight = ramp(luma, 172, 236) * (1 - ramp(sat, 0.14, 0.3));
    if (weight <= 0) continue;
    for (let c = 0; c < 3; c += 1) {
      data[o + c] = clamp(Math.round(data[o + c] + (255 - data[o + c]) * weight));
    }
  }
  return data;
}

/**
 * Put the ink back where the division lifted it, by mapping the darkest half a
 * percent of the crop to black. Shared across channels on purpose: a per-channel
 * black point would shift the hue of the mark, which is the one thing about
 * somebody else's logo we are not entitled to change.
 */
function blackPoint(data, w, h, channels) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i += 1) {
    for (let c = 0; c < channels; c += 1) hist[data[i * channels + c]] += 1;
  }
  const target = w * h * channels * 0.005;
  let seen = 0;
  for (let v = 0; v < 256; v += 1) {
    seen += hist[v];
    if (seen >= target) return v;
  }
  return 0;
}

await mkdir(OUT_DIR, { recursive: true });

for (const logo of LOGOS) {
  const { width, height } = logo.crop;
  const cropped = sharp(path.join(ROOT, logo.source)).extract(logo.crop).removeAlpha();
  const { data, info } = await cropped.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  // Flatten the lighting, put the ink back, and only then call the rest paper —
  // the black-point stretch drags near-whites down a little on its way past, so
  // whitening before it would leave the background just short of white again.
  const levelled =
    logo.paper === "flat" ? flatField(data, width, height, channels) : Buffer.from(data);
  const black = blackPoint(levelled, width, height, channels);
  const gain = 255 / (255 - black);
  for (let i = 0; i < levelled.length; i += 1) {
    levelled[i] = clamp(Math.round(gain * (levelled[i] - black)));
  }
  paperToWhite(levelled, width, height, channels);

  await sharp(levelled, { raw: { width, height, channels } })
    .resize({ height: logo.height, kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, logo.file));

  console.log(
    `${logo.label.padEnd(14)} ${logo.file.padEnd(22)} ${logo.paper.padEnd(5)} ` +
      `black ${String(black).padStart(3)} — ${logo.source}`,
  );
}
