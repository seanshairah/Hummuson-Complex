import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { toMapPin, type MapPin } from "@/lib/maps";

export interface DistributorData {
  id: string;
  name: string;
  slug: string;
  town: string;
  address: string | null;
  phones: string[];
  notes: string | null;
  /**
   * The pin, when somebody has read real coordinates off the map. Null means
   * the page falls back to a Google search of the address text — a guess by
   * Google, which is honest, rather than a guess by us, which would not be.
   */
  pin: MapPin | null;
}

/** Stockists grouped under the town they trade in, in the owner's order. */
export interface DistributorTown {
  town: string;
  distributors: DistributorData[];
}

/**
 * Every published stockist, grouped by town.
 *
 * Town order follows the order of the underlying list rather than the
 * alphabet: the owner decides which town leads, and re-ordering the content
 * file is how they say so.
 */
export const getDistributorTowns = unstable_cache(
  async (): Promise<DistributorTown[]> => {
    const rows = await db.distributor.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    const towns = new Map<string, DistributorTown>();
    for (const row of rows) {
      const entry = towns.get(row.town) ?? { town: row.town, distributors: [] };
      entry.distributors.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        town: row.town,
        address: row.address,
        phones: row.phones,
        notes: row.notes,
        pin: toMapPin(row),
      });
      towns.set(row.town, entry);
    }
    return [...towns.values()];
  },
  ["distributor-towns"],
  { tags: ["distributors"], revalidate: 600 },
);

/** Every stockist, flat, for the admin list. */
export async function getAllDistributors() {
  return db.distributor.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
}

export async function getDistributorById(id: string) {
  return db.distributor.findUnique({ where: { id } });
}
