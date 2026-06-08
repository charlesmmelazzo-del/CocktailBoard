import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const password = body.password || "";

  if (username.length < 2) {
    return NextResponse.json(
      { error: "Username must be at least 2 characters." },
      { status: 400 },
    );
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 },
    );
  }

  const existing = await query<{ id: number }>(
    "SELECT id FROM users WHERE lower(username) = lower($1)",
    [username],
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "That username is taken." },
      { status: 409 },
    );
  }

  // The very first account to register becomes the admin.
  const count = await query<{ count: string }>("SELECT count(*) AS count FROM users");
  const isFirstUser = Number(count[0]?.count ?? 0) === 0;

  const hash = await bcrypt.hash(password, 10);
  const rows = await query<{ id: number; username: string; is_admin: boolean }>(
    "INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin",
    [username, hash, isFirstUser],
  );
  const user = rows[0];

  await createSession({ userId: user.id, username: user.username });
  return NextResponse.json({
    user: { id: user.id, username: user.username, is_admin: user.is_admin },
  });
}
