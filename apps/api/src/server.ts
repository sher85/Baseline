import { app } from "./app.js";
import { env } from "./config/env.js";
import { startScheduledOuraSync } from "./modules/jobs/sync-scheduler.service.js";

let schedulerController: ReturnType<typeof startScheduledOuraSync> | null = null;
const host = "0.0.0.0";

const server = app.listen(env.API_PORT, host, () => {
  console.log(`API listening on http://${host}:${env.API_PORT}`);

  schedulerController = startScheduledOuraSync();
});

server.on("close", () => {
  schedulerController?.stop();
  schedulerController = null;
  console.log("API server closed.");
});
