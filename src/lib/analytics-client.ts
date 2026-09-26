/**
 * First-party client event tracking. Fire-and-forget beacons into
 * /api/events (stored as AnalyticsEvent rows for the admin insights page).
 * No cookies, no personal data — event type + entity only.
 */
export type ClientEventType =
  | "PRODUCT_VIEW"
  | "ARTICLE_VIEW"
  | "CROP_VIEW"
  | "PROJECT_VIEW"
  | "VIDEO_PLAY"
  | "CATALOGUE_VIEW"
  | "CATALOGUE_PAGE_TURN"
  | "WHATSAPP_CLICK"
  | "FINDER_STARTED"
  | "FINDER_COMPLETED"
  | "ASK_OPENED"
  | "PDF_DOWNLOAD";

export function trackClient(
  type: ClientEventType,
  payload: { path?: string; entityType?: string; entityId?: string; meta?: Record<string, unknown> } = {},
): void {
  try {
    const body = JSON.stringify({ type, ...payload });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Analytics must never break the experience.
  }
}
