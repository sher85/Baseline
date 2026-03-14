import cors from "cors";
import express from "express";

import { healthRouter } from "./routes/health.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "wearable-analytics-api",
    status: "booting",
    docs: "/health"
  });
});

app.use("/health", healthRouter);
