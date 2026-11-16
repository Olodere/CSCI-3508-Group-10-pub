// Creates the salon owner's admin account, or resets its password if the
// email already exists. There is deliberately no sign-up page or route.
//
// Usage (from code/api, after creating .env):
//   npm run admin:create
//
// The password is typed at a hidden prompt and never stored in a file.

import "dotenv/config";
import { createInterface } from "node:readline";
import pg from "pg";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  hashPassword,
} from "../src/auth/password";

type Prompter = {
  ask(question: string): Promise<string>;
  askHidden(question: string): Promise<string>;
  close(): void;
};

// Interactive terminal. Visible questions use readline; passwords are read
// one key at a time in raw mode so nothing is echoed. (Muting readline's
// output also erased the prompt text on Windows terminals.)
function createTtyPrompter(): Prompter {
  const ask = (q: string) =>
    new Promise<string>((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(q, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

  const askHidden = (q: string) =>
    new Promise<string>((resolve) => {
      const stdin = process.stdin;
      process.stdout.write(q);
      stdin.setRawMode(true);
      stdin.setEncoding("utf8");
      stdin.resume();
      let value = "";
      const onData = (chunk: string) => {
        for (const ch of chunk) {
          if (ch === "\r" || ch === "\n") {
            stdin.off("data", onData);
            stdin.setRawMode(false);
            stdin.pause();
            process.stdout.write("\n");
            resolve(value);
            return;
          }
          if (ch === "\u0003") {
            // Ctrl+C
            stdin.setRawMode(false);
            process.stdout.write("\n");
            process.exit(130);
          }
          if (ch === "\u007f" || ch === "\b") {
            value = value.slice(0, -1); // Backspace
            continue;
          }
          if (ch >= " ") value += ch;
        }
      };
      stdin.on("data", onData);
    });

  return { ask, askHidden, close: () => undefined };
}

// Piped input (no terminal), e.g. for automated setup: reads lines in order.
function createPipePrompter(): Prompter {
  const rl = createInterface({ input: process.stdin, terminal: false });
  const lines: string[] = [];
  const waiting: ((line: string) => void)[] = [];
  let closed = false;
  rl.on("line", (line) => {
    const next = waiting.shift();
    if (next) next(line);
    else lines.push(line);
  });
  rl.on("close", () => {
    closed = true;
    while (waiting.length) waiting.shift()!("");
  });
  const nextLine = (): Promise<string> =>
    lines.length
      ? Promise.resolve(lines.shift()!)
      : closed
        ? Promise.resolve("")
        : new Promise((resolve) => waiting.push(resolve));

  return {
    async ask(q) {
      process.stdout.write(q);
      return (await nextLine()).trim();
    },
    async askHidden(q) {
      process.stdout.write(q + "\n");
      return nextLine();
    },
    close: () => rl.close(),
  };
}

function fail(message: string): never {
  console.error(`\nError: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.ADMIN_DATABASE_URL;
  if (!databaseUrl)
    fail("ADMIN_DATABASE_URL is not set. Add to .env first.");

  const prompt = process.stdin.isTTY
    ? createTtyPrompter()
    : createPipePrompter();
  const email = (await prompt.ask("Admin email: ")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Invalid email.");

  const fullName = await prompt.ask("Full name: ");
  if (!fullName) fail("Full name is required.");

  const password = await prompt.askHidden(
    `Password (at least ${MIN_PASSWORD_LENGTH} characters): `,
  );
  const confirm = await prompt.askHidden("Confirm password: ");
  prompt.close();

  if (password !== confirm) fail("Passwords do not match.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    fail(`Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);
  }

  const passwordHash = await hashPassword(password);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string; inserted: boolean }>(
      `INSERT INTO admin_users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name     = EXCLUDED.full_name,
             is_active     = TRUE
       RETURNING id, (xmax = 0) AS inserted`,
      [email, passwordHash, fullName],
    );
    const { id, inserted } = rows[0]!;
    if (!inserted) {
      // Password reset: sign out every existing session for this account.
      await client.query(
        "DELETE FROM session WHERE (sess ->> 'adminId') = $1",
        [String(id)],
      );
    }
    await client.query("COMMIT");
    console.log(
      inserted
        ? `\nCreated admin account for ${email}.`
        : `\nUpdated password for ${email} and signed out its existing sessions.`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    if ((err as { code?: string }).code === "42P01") {
      fail(
        "Tables missing. Run the migrations first (make migrate in code/db).",
      );
    }
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) =>
  fail(err instanceof Error ? err.message : String(err)),
);
