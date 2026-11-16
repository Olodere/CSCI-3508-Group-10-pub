import { createApp } from "./app";
import { env } from "./config";
import { closePool } from "./db/pool";
import { logger } from "./logger";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    `API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info(`Received ${signal}; shutting down`);
  server.close(async (err) => {
    if (err) logger.error({ err }, "Error during HTTP shutdown");
    await closePool().catch((poolErr) =>
      logger.error({ err: poolErr }, "Error closing PG pool"),
    );
    process.exit(err ? 1 : 0);
  });
  setTimeout(() => {
    logger.error("Forced shutdown after 10s");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (err) =>
  logger.error({ err }, "unhandledRejection"),
);
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});