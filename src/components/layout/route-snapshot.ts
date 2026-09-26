/**
 * The page as it looked when a link was clicked, kept as an inert copy so the
 * route transition (route-transition.tsx) can dissolve it over the page that
 * replaces it: old and new are on screen together for half a second, the old
 * one fading and lifting away while the new one's opener rises into place.
 *
 * Why a copy, and not the View Transitions API, which exists to do exactly
 * this. The API captures the old page when it is asked to start and then
 * suspends rendering until the new page is in the document, so the screen is
 * frozen for the whole of the load. For a prefetched page that is a frame or
 * two; for the product listing, which renders per request, it is a server
 * round trip from Zimbabwe, and a page that stops responding for most of a
 * second after a click reads as broken. React's own integration starts the
 * transition at commit instead, but in this version of Next it needs the
 * experimental React build. A copy costs a few milliseconds at the click and
 * leaves the live page, with its progress line, running until the next page
 * is ready.
 *
 * What the copy has to get right to be indistinguishable from the page:
 *
 *   Position. It is taken of the whole shell (header, main, footer, the
 *   WhatsApp button) and laid out in a scroller set to the page's scroll
 *   position, so sticky elements sit where they were stuck.
 *
 *   Fixed elements. Those pinned to the viewport (the header, a product's
 *   action bar, the reading-progress bar, the dot navigation) are lifted out
 *   of the scroller, which moves as the copy drifts away, and pinned to the
 *   overlay instead.
 *
 *   Running CSS animations (the drifting light, the WhatsApp pulse) are held
 *   at the frame they were on rather than jumping back to their first. Held,
 *   not resumed: they move too slowly for half a second to show, and a still
 *   copy is cheaper to paint in the frame that matters.
 *
 *   Images. A lazy image the page had already loaded is made eager in the
 *   copy; left lazy it would be blank for its first frame, which is the one
 *   frame in which the copy is fully opaque.
 *
 *   Isolation. It carries no ids, test ids or screen markers, so nothing that
 *   looks the page up by them finds the copy; embedded frames become plain
 *   boxes rather than loading a second YouTube player or map; and it is inert
 *   and hidden from assistive technology.
 *
 *   Weight. Blocks more than a viewport away from the visible area become
 *   empty blocks of the same height. The copy is laid out in the same frame
 *   as the next page, and the homepage alone is eight screens tall.
 */

/** How far the page being left lifts as it dissolves, in px. */
export const DRIFT_PX = 28;
/** How long the dissolve takes, in ms. */
export const DISSOLVE_MS = 520;

const HOIST = "data-snapshot-hoist";
const ANIMATED = "data-snapshot-anim";
const LOADED = "data-snapshot-loaded";
const MARKS = [HOIST, ANIMATED, LOADED];

interface RecordedAnimation {
  target: number;
  name: string;
  pseudo: string | null;
  time: number;
}

export interface PageSnapshot {
  /** A copy of the shell holding copies of everything that scrolls. */
  flow: HTMLElement;
  /** Copies of everything pinned to the viewport. */
  fixed: HTMLElement[];
  /** The shell's width, so the copy lays out as the page did even if the scrollbar goes. */
  width: number;
  /** Where the page was scrolled to; kept current while the next page loads. */
  scrollY: number;
  /** The document's own background, showing wherever no section paints one. */
  background: string;
  animations: RecordedAnimation[];
  takenAt: number;
}

interface Band {
  top: number;
  bottom: number;
}

/** A same-height empty block for a copy whose original is nowhere near the viewport. */
function standInIfFar(original: Element, copy: Element, near: Band): Element {
  const style = getComputedStyle(original);
  if (style.position !== "static" && style.position !== "relative") return copy;
  if (copy.hasAttribute(HOIST) || copy.querySelector(`[${HOIST}]`)) return copy;
  const rect = original.getBoundingClientRect();
  if (rect.height === 0 || (rect.bottom >= near.top && rect.top <= near.bottom)) return copy;
  const stand = document.createElement("div");
  stand.style.height = `${rect.height}px`;
  stand.style.marginTop = style.marginTop;
  stand.style.marginBottom = style.marginBottom;
  return stand;
}

/** Walks main's blocks, through `display: contents` wrappers, standing in for the far ones. */
function trimFar(original: Element, copy: Element, near: Band) {
  const originals = Array.from(original.children);
  const copies = Array.from(copy.children);
  originals.forEach((child, i) => {
    const twin = copies[i];
    if (!twin) return;
    if (getComputedStyle(child).display === "contents") {
      trimFar(child, twin, near);
      return;
    }
    const kept = standInIfFar(child, twin, near);
    if (kept !== twin) twin.replaceWith(kept);
  });
}

function scrub(root: HTMLElement) {
  for (const el of [root, ...Array.from(root.querySelectorAll("*"))]) {
    // SVG ids stay: a gradient or clip path is referenced by id from the
    // same drawing, and the copy's references would otherwise dangle.
    if (el instanceof HTMLElement) el.removeAttribute("id");
    el.removeAttribute("data-testid");
    el.removeAttribute("data-screen");
    el.removeAttribute("data-screens");
    el.removeAttribute("autofocus");
    el.removeAttribute(HOIST);
  }
  for (const el of Array.from(root.querySelectorAll("script, noscript, template"))) el.remove();
  for (const el of Array.from(
    root.querySelectorAll<HTMLElement>("iframe, video, audio, canvas, object, embed"),
  )) {
    const box = document.createElement("div");
    box.className = el.getAttribute("class") ?? "";
    box.setAttribute("style", el.getAttribute("style") ?? "");
    for (const side of ["width", "height"] as const) {
      const value = el.getAttribute(side);
      if (value) box.style[side] = /^\d+$/.test(value) ? `${value}px` : value;
    }
    box.style.background = "rgb(0 0 0 / 0.08)";
    el.replaceWith(box);
  }
  for (const img of Array.from(root.querySelectorAll("img"))) {
    if (img.hasAttribute(LOADED)) {
      img.removeAttribute(LOADED);
      img.loading = "eager";
    }
    img.decoding = "sync";
  }
}

/** Copies the page as it is on screen now. Returns null if the shell is not the expected one. */
export function capturePage(): PageSnapshot | null {
  const main = document.getElementById("main");
  const shell = main?.parentElement;
  if (!main || !shell) return null;

  const marked: Element[] = [];
  const mark = (el: Element, name: string, value = "") => {
    el.setAttribute(name, value);
    marked.push(el);
  };

  try {
    // Marks on the live page for the copy to find again: fixed elements
    // inside the page, lazy images already loaded, animated elements.
    for (const el of Array.from(main.querySelectorAll('[class*="fixed"]'))) {
      if (getComputedStyle(el).position === "fixed") mark(el, HOIST);
    }
    for (const img of Array.from(shell.querySelectorAll("img"))) {
      if (img.loading === "lazy" && img.complete && img.naturalWidth > 0) mark(img, LOADED);
    }
    const targets: Element[] = [];
    const animations: RecordedAnimation[] = [];
    for (const animation of document.getAnimations()) {
      if (!("animationName" in animation)) continue; // CSS animations only
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target;
      const time = animation.currentTime;
      if (!effect || !target || !shell.contains(target) || typeof time !== "number") continue;
      let index = targets.indexOf(target);
      if (index === -1) {
        index = targets.push(target) - 1;
        mark(target, ANIMATED, String(index));
      }
      animations.push({
        target: index,
        name: (animation as CSSAnimation).animationName,
        pseudo: effect.pseudoElement ?? null,
        time,
      });
    }

    const viewport = window.innerHeight;
    const near = { top: -viewport, bottom: viewport * 2 };
    const flow = shell.cloneNode(false) as HTMLElement;
    const fixed: HTMLElement[] = [];
    for (const child of Array.from(shell.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.hasAttribute("data-route-chrome") || child.matches('a[href="#main"]')) continue;
      const style = getComputedStyle(child);
      if (style.display === "none") continue;
      const copy = child.cloneNode(true) as HTMLElement;
      if (style.position === "fixed") {
        fixed.push(copy);
      } else if (child === main) {
        trimFar(child, copy, near);
        flow.append(copy);
      } else {
        flow.append(standInIfFar(child, copy, near));
      }
    }
    for (const el of Array.from(flow.querySelectorAll<HTMLElement>(`[${HOIST}]`))) {
      el.remove();
      fixed.push(el);
    }
    // As deep as the drift: the scroller is that much taller than the
    // viewport, and a page scrolled to its very end must still show its end.
    const spacer = document.createElement("div");
    spacer.style.height = `${DRIFT_PX}px`;
    flow.append(spacer);
    for (const root of [flow, ...fixed]) scrub(root);

    return {
      flow,
      fixed,
      width: shell.getBoundingClientRect().width,
      scrollY: window.scrollY,
      background: getComputedStyle(document.body).backgroundColor,
      animations,
      takenAt: performance.now(),
    };
  } catch {
    return null;
  } finally {
    for (const el of marked) for (const name of MARKS) el.removeAttribute(name);
  }
}

function holdAnimations(root: HTMLElement, snapshot: PageSnapshot) {
  const elapsed = performance.now() - snapshot.takenAt;
  for (const el of Array.from(root.querySelectorAll(`[${ANIMATED}]`))) {
    const index = Number(el.getAttribute(ANIMATED));
    el.removeAttribute(ANIMATED);
    const recorded = snapshot.animations.filter((a) => a.target === index);
    for (const animation of el.getAnimations()) {
      if (!("animationName" in animation)) continue;
      const effect = animation.effect as KeyframeEffect | null;
      const match = recorded.find(
        (r) =>
          r.name === (animation as CSSAnimation).animationName &&
          r.pseudo === (effect?.pseudoElement ?? null),
      );
      if (match) animation.currentTime = match.time + elapsed;
      animation.pause();
    }
  }
}

/**
 * Puts the copy over the page and dissolves it: it fades out and lifts a
 * little, while the header and anything else pinned to the viewport fade in
 * place. `onStart` runs when the fade has actually begun on screen (the
 * browser has painted the copy and the page beneath), `onDone` when it is
 * gone. Returns a function that brings it to an end: "hurry" plays the rest
 * at four times the speed (a second click mid-way, so the page the reader is
 * leaving is not cut off with a pop), "now" removes it at once.
 */
export type SettleDissolve = (how: "hurry" | "now") => void;

export function dissolvePage(
  snapshot: PageSnapshot,
  { onStart, onDone }: { onStart: () => void; onDone: () => void },
): SettleDissolve {
  const ghost = document.createElement("div");
  ghost.setAttribute("data-route-ghost", "");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  // `contain: strict` makes the overlay the containing block for the fixed
  // copies inside it; as it covers exactly the viewport, they sit where the
  // originals sat.
  ghost.style.cssText =
    "position:fixed;inset:0;z-index:45;pointer-events:none;overflow:hidden;contain:strict";

  const scroller = document.createElement("div");
  scroller.style.cssText = [
    "position:absolute",
    "top:0",
    "left:0",
    `bottom:-${DRIFT_PX}px`,
    `width:${snapshot.width}px`,
    "overflow:hidden",
    `background:${snapshot.background}`,
  ].join(";");
  scroller.append(snapshot.flow);
  ghost.append(scroller, ...snapshot.fixed);
  document.body.append(ghost);
  scroller.scrollTop = snapshot.scrollY;
  holdAnimations(ghost, snapshot);

  const fade = ghost.animate(
    { opacity: [1, 0] },
    { duration: DISSOLVE_MS, easing: "cubic-bezier(0.33, 0, 0.2, 1)", fill: "forwards" },
  );
  const lift = scroller.animate(
    { transform: ["translateY(0px)", `translateY(-${DRIFT_PX}px)`] },
    { duration: DISSOLVE_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
  );

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    onStart();
  };
  fade.ready.then(start, start);

  let over = false;
  // A background tab does not advance animations; nothing may outlive this.
  const safety = setTimeout(() => end(), DISSOLVE_MS + 1500);
  function end() {
    if (over) return;
    over = true;
    clearTimeout(safety);
    fade.cancel();
    lift.cancel();
    ghost.remove();
    start();
    onDone();
  }
  fade.finished.then(end, end);
  return (how) => {
    if (how === "now") end();
    else {
      fade.updatePlaybackRate(4);
      lift.updatePlaybackRate(4);
    }
  };
}
