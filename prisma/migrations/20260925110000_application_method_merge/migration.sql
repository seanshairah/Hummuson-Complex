-- Soil and drench become one method; fertigation and basal dressing go.
--
-- The owner's instruction on 25 Sep 2026: "soil/drench should be one thing on
-- application", and "remove fertigation and basal dressing". Two filters for
-- one answer split the catalogue for no gain, and the two that go describe when
-- a product is put out rather than how.
--
-- Postgres cannot drop a value from an enum in place, so the type is rebuilt.
-- The data moves through TEXT so the remap is ordinary SQL: SOIL and DRENCH
-- both land on SOIL_DRENCH, de-duplicated where a product declared both, and
-- BASAL_DRESSING and FERTIGATION are dropped from the arrays entirely.
ALTER TYPE "ApplicationMethod" RENAME TO "ApplicationMethod_old";

CREATE TYPE "ApplicationMethod" AS ENUM ('FOLIAR', 'SOIL_DRENCH', 'SEED_TREATMENT', 'TOP_DRESSING', 'OTHER');

-- Product.applicationMethods ─────────────────────────────────────────────────
ALTER TABLE "Product"
  ALTER COLUMN "applicationMethods" TYPE TEXT[] USING "applicationMethods"::TEXT[];

UPDATE "Product" AS p
SET "applicationMethods" = remapped.methods
FROM (
  SELECT
    id,
    ARRAY(
      SELECT DISTINCT
        CASE m
          WHEN 'SOIL' THEN 'SOIL_DRENCH'
          WHEN 'DRENCH' THEN 'SOIL_DRENCH'
          ELSE m
        END
      FROM unnest("applicationMethods") AS m
      WHERE m NOT IN ('BASAL_DRESSING', 'FERTIGATION')
    ) AS methods
  FROM "Product"
) AS remapped
WHERE p.id = remapped.id;

ALTER TABLE "Product"
  ALTER COLUMN "applicationMethods" TYPE "ApplicationMethod"[] USING "applicationMethods"::"ApplicationMethod"[];

-- ApplicationGuide.method ────────────────────────────────────────────────────
-- A guide row that named a dropped method keeps its rate and loses the method:
-- the rate is the thing Humuson published, and a row silently re-filed under
-- SOIL_DRENCH would claim a recommendation nobody made.
ALTER TABLE "ApplicationGuide"
  ALTER COLUMN "method" TYPE TEXT USING "method"::TEXT;

UPDATE "ApplicationGuide"
SET "method" = CASE
  WHEN "method" IN ('SOIL', 'DRENCH') THEN 'SOIL_DRENCH'
  WHEN "method" IN ('BASAL_DRESSING', 'FERTIGATION') THEN NULL
  ELSE "method"
END;

ALTER TABLE "ApplicationGuide"
  ALTER COLUMN "method" TYPE "ApplicationMethod" USING "method"::"ApplicationMethod";

DROP TYPE "ApplicationMethod_old";
