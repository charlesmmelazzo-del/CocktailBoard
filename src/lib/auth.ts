import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { query } from "./db";

const COOKIE_NAME = "cb_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
  return new TextEncoder().encode(s);
}

// The cookie only ever stores identity. Admin status is read live from the
// database so granting/revoking admin takes effect immediately (no re-login).
export interface Session {
  userId: number;
  username: string;
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ username: session.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK,
  });
}

export function clearSession(): void {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: Number(payload.sub),
      username: String(payload.username),
    };
  } catch {
    return null;
  }
}

// Whether the signed-in user is currently an admin (read from the database).
export async function currentUserIsAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const rows = await query<{ is_admin: boolean }>(
    "SELECT is_admin FROM users WHERE id = $1",
    [session.userId],
  );
  return rows[0]?.is_admin === true;
}

// Returns the session only if the signed-in user is currently an admin.
export async function getAdminSession(): Promise<Session | null> {
  const session = await getSession();
  if (!session) return null;
  return (await currentUserIsAdmin()) ? session : null;
}
