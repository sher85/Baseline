import { app } from "./app.js";
import { env } from "./config/env.js";
import { startScheduledOuraSync } from "./modules/jobs/sync-scheduler.service.js";

let schedulerController: ReturnType<typeof startScheduledOuraSync> | null = null;

const server = app.listen(env.API_PORT, () => {
  console.log(`API listening on http://localhost:${env.API_PORT}`);

  schedulerController = startScheduledOuraSync();
});

server.on("close", () => {
  schedulerController?.stop();
  schedulerController = null;
  console.log("API server closed.");
});
