/**
 * Which pages open on a dark ground.
 *
 * Two things need the same answer: the header, which starts light-on-dark over
 * an immersive opener, and the route veil, which is tinted to the page it is
 * revealing so a navigation into a dark page reads as that page arriving
 * rather than as a blink to paper on the way. One list, so they cannot
 * disagree.
 */
export const DARK_ROUTE_PREFIXES = ["/catalogue", "/product-finder", "/about"] as const;

export type RouteTone = "dark" | "light";

export function routeTone(pathname: string): RouteTone {
  if (pathname === "/") return "dark";
  return DARK_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ? "dark" : "light";
}
