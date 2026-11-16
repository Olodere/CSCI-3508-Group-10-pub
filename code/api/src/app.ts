import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config";
import { errorHandler } from "./middleware/error";
import { requestLog } from "./middleware/requestLog";
import { requestIdHeader } from "./middleware/requestIdHeader";
import { healthRouter } from "./routes/health";
import { adminRouter } from "./routes/admin";
import { publicRouter } from "./routes/public";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(requestLog);
  app.use(requestIdHeader);          // <-- added

  app.use("/health", healthRouter);

  app.use("/api", publicRouter);
  app.use("/api/admin", adminRouter);

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
        details: null,
      },
    });
  });

  app.use(errorHandler);

  return app;
}