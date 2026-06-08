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

  const hash = await bcrypt.hash(password, 10);
  const rows = await query<{ id: number; username: string }>(
    "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
    [username, hash],
  );
  const user = rows[0];

  await createSession({ userId: user.id, username: user.username });
  return NextResponse.json({ user });
}
