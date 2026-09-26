"use client";

import { useEffect } from "react";
import { trackClient, type ClientEventType } from "@/lib/analytics-client";

/** Fires a single view event on mount (product/article/crop/project pages). */
export function ViewTracker({
  type,
  entityType,
  entityId,
  path,
}: {
  type: ClientEventType;
  entityType: string;
  entityId: string;
  path?: string;
}) {
  useEffect(() => {
    trackClient(type, { entityType, entityId, path });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);
  return null;
}
