import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import { logger } from "../logger";

export const requestLog = pinoHttp({
  logger,
  genReqId: (req) => {
    const incoming = req.headers["x-request-id"];
    const value =
      typeof incoming === "string" && incoming.length > 0
        ? incoming
        : randomUUID();
    return value.slice(0, 64);
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) {
      // /health returns 503 by design when the DB is down; don't spam errors.
      if (req.url === "/health") return "warn";
      return "error";
    }
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});