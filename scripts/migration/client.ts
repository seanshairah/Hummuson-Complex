/**
 * Prisma client factory for migration scripts.
 *
 * Default: standard TCP client (local dev, CI, any host with port-5432
 * egress). With NEON_WS=1 the client speaks to Neon through the serverless
 * driver over WebSocket/HTTPS (port 443) instead — for environments where
 * outbound Postgres traffic is blocked but 443 is open.
 */
import { PrismaClient } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  if (process.env.NEON_WS === "1") {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { neonConfig } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
    const { PrismaNeon } = require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
    const ws = require("ws") as typeof import("ws");
    /* eslint-enable @typescript-eslint/no-require-imports */
    neonConfig.webSocketConstructor = ws.WebSocket ?? ws;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required with NEON_WS=1");
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  }
  return new PrismaClient();
}
