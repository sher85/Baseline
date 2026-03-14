import { runManualOuraSync } from "./oura-sync.service.js";

runManualOuraSync()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
