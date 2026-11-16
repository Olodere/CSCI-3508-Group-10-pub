import pino from "pino";
import { env, isDev, isTest } from "./config";

export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "*.password",
      "*.password_hash",
      "*.passwordHash",
      "*.customer_email",
      "*.customerEmail",
      "*.customer_phone",
      "*.customerPhone",
      "*.service_address",
      "*.serviceAddress",
    ],
    censor: "[REDACTED]",
  },
});