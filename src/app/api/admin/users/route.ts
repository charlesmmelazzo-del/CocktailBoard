import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// List all users (admin only).
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const users = await query(
    "SELECT id, username, is_admin, created_at FROM users ORDER BY id",
  );
  return NextResponse.json({ users });
}

// Update a user: rename, reset password, and/or grant/revoke admin (admin only).
export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  const target = await query<{ id: number; is_admin: boolean }>(
    "SELECT id, is_admin FROM users WHERE id = $1",
    [id],
  );
  if (target.length === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Rename
  if (typeof body.username === "string") {
    const username = body.username.trim();
    if (username.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 characters." },
        { status: 400 },
      );
    }
    const clash = await query<{ id: number }>(
      "SELECT id FROM users WHERE lower(username) = lower($1) AND id <> $2",
      [username, id],
    );
    if (clash.length > 0) {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }
    await query("UPDATE users SET username = $1 WHERE id = $2", [username, id]);
  }

  // Reset password
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters." },
        { status: 400 },
      );
    }
    const hash = await bcrypt.hash(body.password, 10);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, id]);
  }

  // Grant / revoke admin
  if (typeof body.is_admin === "boolean") {
    if (body.is_admin === false && target[0].is_admin) {
      const admins = await query<{ count: string }>(
        "SELECT count(*) AS count FROM users WHERE is_admin = true",
      );
      if (Number(admins[0].count) <= 1) {
        return NextResponse.json(
          { error: "There must be at least one admin." },
          { status: 400 },
        );
      }
    }
    await query("UPDATE users SET is_admin = $1 WHERE id = $2", [body.is_admin, id]);
  }

  return NextResponse.json({ ok: true });
}

// Delete a user and everything they own (admin only).
export async function DELETE(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }
  if (id === admin.userId) {
    return NextResponse.json(
      { error: "You can't delete your own account." },
      { status: 400 },
    );
  }
  await query("DELETE FROM users WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
