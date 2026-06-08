import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Upsert the signed-in user's note on a cocktail. Each user has one note per
// cocktail; everyone can read all notes (attributed by username).
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const cocktailId = Number(body.cocktail_id);
  const text = String(body.body || "");
  if (!cocktailId) {
    return NextResponse.json({ error: "Missing cocktail_id." }, { status: 400 });
  }

  await query(
    `INSERT INTO notes (cocktail_id, user_id, body, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (cocktail_id, user_id)
     DO UPDATE SET body = EXCLUDED.body, updated_at = now()`,
    [cocktailId, session.userId, text],
  );
  return NextResponse.json({ ok: true });
}
