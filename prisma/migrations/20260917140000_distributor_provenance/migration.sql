-- Provenance for a stockist row.
--
-- The branch lists were transcribed from a third-party directory that rates its
-- own listing "0% accurate", plus social posts and a flyer. Both columns are
-- admin-only: sourceNote says where the row came from, verifiedAt records that
-- somebody rang the shop and confirmed it.
ALTER TABLE "Distributor" ADD COLUMN "sourceNote" TEXT;
ALTER TABLE "Distributor" ADD COLUMN "verifiedAt" TIMESTAMP(3);
