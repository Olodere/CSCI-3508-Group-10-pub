import { hash, verify } from "@node-rs/argon2";

// argon2id with the library's defaults (OWASP-recommended), per the
// "Passwords" entry in documentation/api-decision-log.md.

export const MIN_PASSWORD_LENGTH = 12;
// Generous cap so a huge request body cannot make hashing expensive.
export const MAX_PASSWORD_LENGTH = 256;

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

// When an email is not found we still verify against this hash, so
// "unknown email" and "wrong password" take the same time and an attacker
// cannot tell which emails have accounts.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hash("dummy-password-for-timing-only");
  return dummyHash;
}

/** True only if `storedHash` is not null and matches `password`. */
export async function verifyPassword(
  password: string,
  storedHash: string | null,
): Promise<boolean> {
  const target = storedHash ?? (await getDummyHash());
  let matches = false;
  try {
    matches = await verify(target, password);
  } catch {
    // A malformed stored hash counts as a failed login, never a crash.
    matches = false;
  }
  return storedHash !== null && matches;
}
