-- Stockists: the shops that sell Humuson product, grouped by town.
--
-- Coordinates are nullable because the owner supplies street addresses, not
-- pins; the site falls back to a Google address search until a pin exists.
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "address" TEXT,
    "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "mapsLat" DOUBLE PRECISION,
    "mapsLng" DOUBLE PRECISION,
    "mapsUrl" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Distributor_slug_key" ON "Distributor"("slug");
CREATE INDEX "Distributor_town_idx" ON "Distributor"("town");
