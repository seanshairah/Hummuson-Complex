/**
 * Where a route transition is (src/components/layout/route-transition.tsx),
 * published on `<html data-route-transition>` so that the page arriving can
 * time itself to it:
 *
 *   leaving     a link was clicked; the next page is loading
 *   arriving    the next page is in the document, under a copy of the old one
 *   dissolving  the copy has started to fade (the browser has painted it)
 *
 * The step from arriving to dissolving is the one that matters to an opener.
 * The copy can only start to fade once the browser has painted it and the
 * new page beneath, and on a slow device that takes a visible moment; an
 * opener that started at mount would do its rising under the copy, unseen.
 * `dissolving` is announced with an event as well, for anything waiting.
 */
export type RouteStage = "leaving" | "arriving" | "dissolving";

export const ROUTE_DISSOLVE_EVENT = "route-transition:dissolve";

export function getRouteStage(): RouteStage | null {
  if (typeof document === "undefined") return null;
  const value = document.documentElement.getAttribute("data-route-transition");
  return value === "leaving" || value === "arriving" || value === "dissolving" ? value : null;
}

export function setRouteStage(stage: RouteStage | null) {
  const root = document.documentElement;
  if (stage) root.setAttribute("data-route-transition", stage);
  else root.removeAttribute("data-route-transition");
  if (stage === "dissolving") window.dispatchEvent(new Event(ROUTE_DISSOLVE_EVENT));
}
