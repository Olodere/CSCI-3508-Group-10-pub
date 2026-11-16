import { Router } from "express";
import { checkDbHealth } from "../db/pool";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const db = await checkDbHealth();
  const ok = db.ok;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    db: ok ? "ok" : "error",
    version: ok ? db.version : null,
    timestamp: new Date().toISOString(),
  });
});