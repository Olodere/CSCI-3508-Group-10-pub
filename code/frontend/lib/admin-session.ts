import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.API_URL ?? "http://localhost:3001";
export const SESSION_COOKIE_NAME = "session"; // set by the API, see api-contract.md
export const LOGIN_PATH = "/admin/login";

export type SessionAdmin = { id: number; email: string; fullName: string };
export type AdminSession = { admin: SessionAdmin; csrfToken: string };

/**
 * Asks the API who is signed in, by forwarding this visitor's session cookie
 * to GET /api/admin/session. Returns null if not signed in.
 * cache() makes repeated calls within one page render share one request.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!cookie) return null;

  const res = await fetch(`${API_URL}/api/admin/session`, {
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookie.value)}`,
    },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Admin session check failed (${res.status})`);
  return (await res.json()) as AdminSession;
});

/**
 * Call at the top of every admin page. Sends signed-out visitors to the
 * login page. This only decides what the PAGE shows: the API checks the
 * session again on every /api/admin request, which is the real protection.
 */
export async function requireAdminPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}
