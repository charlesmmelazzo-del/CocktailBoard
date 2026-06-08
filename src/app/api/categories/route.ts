import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Create a category (shared across all users' boards).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const max = await query<{ max: number | null }>(
    "SELECT max(position) AS max FROM categories",
  );
  const position = (max[0]?.max ?? -1) + 1;
  const rows = await query(
    "INSERT INTO categories (name, position) VALUES ($1, $2) RETURNING id",
    [name, position],
  );
  return NextResponse.json({ id: rows[0].id });
}

// Rename a category (shared).
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const name = String(body.name || "").trim();
  if (!id || !name) {
    return NextResponse.json({ error: "Missing id or name." }, { status: 400 });
  }
  await query("UPDATE categories SET name = $1 WHERE id = $2", [name, id]);
  return NextResponse.json({ ok: true });
}

// Delete a category (shared). Any cocktails placed there fall back to each
// user's pool because placements.category_id is set to NULL on delete.
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  await query("DELETE FROM categories WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
