import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { SPIRIT_MAP } from "@/lib/constants";

function cleanSpirit(s: unknown): string {
  const id = String(s || "other");
  return SPIRIT_MAP[id] ? id : "other";
}

// Create a cocktail (shared). It starts in everyone's uncategorized pool simply
// by having no placement row yet.
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

  const rows = await query(
    `INSERT INTO cocktails (name, recipe, base_spirit, created_by)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, String(body.recipe || ""), cleanSpirit(body.base_spirit), session.userId],
  );
  return NextResponse.json({ id: rows[0].id });
}

// Edit a cocktail (shared across all users).
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  await query(
    `UPDATE cocktails
        SET name = $1, recipe = $2, base_spirit = $3, updated_at = now()
      WHERE id = $4`,
    [name, String(body.recipe || ""), cleanSpirit(body.base_spirit), id],
  );
  return NextResponse.json({ ok: true });
}

// Delete a cocktail (shared). Cascades remove its placements and notes.
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
  await query("DELETE FROM cocktails WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
