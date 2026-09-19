import "dotenv/config";
import { runImport } from "../scripts/migration/import";

runImport()
  .then(() => {
    console.log("Seed complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
