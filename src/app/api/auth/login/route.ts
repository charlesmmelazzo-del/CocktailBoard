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

  const rows = await query<{
    id: number;
    username: string;
    password_hash: string;
  }>("SELECT id, username, password_hash FROM users WHERE lower(username) = lower($1)", [
    username,
  ]);

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Wrong username or password." },
      { status: 401 },
    );
  }

  await createSession({ userId: user.id, username: user.username });
  return NextResponse.json({ user: { id: user.id, username: user.username } });
}
