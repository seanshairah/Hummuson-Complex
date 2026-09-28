-- Crop groups carry the owner's agronomy for the family: the botanical name,
-- the field signature, the notes, and the member crops no product covers yet.
--
-- All four are additive and nullable/empty-by-default, so the existing rows
-- stay valid and the import fills them on its next run.
ALTER TABLE "Crop" ADD COLUMN "familyName" TEXT;
ALTER TABLE "Crop" ADD COLUMN "signature" TEXT;
ALTER TABLE "Crop" ADD COLUMN "notes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Crop" ADD COLUMN "alsoIncludes" TEXT[] DEFAULT ARRAY[]::TEXT[];
