import express from "express";
import { AdoptionRepository } from "./repositories/adoption.repository.js";
import { createAdoptionRouter } from "./routes/adoption.router.js";

export function createApp({ repository = new AdoptionRepository() } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());
  app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
  app.use("/api/adoptions", createAdoptionRouter({ repository }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    return res
      .status(500)
      .json({ status: "error", error: "Internal server error" });
  });
  return app;
}
