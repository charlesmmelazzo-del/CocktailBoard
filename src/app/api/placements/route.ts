import { NextResponse } from "next/server";
import { pool, ensureDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Replaces the signed-in user's entire board layout. The client sends every
// cocktail it has placed into a category (cocktails left in the pool are simply
// omitted). A user can only ever write their own board.
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const incoming: Array<{
    cocktail_id: number;
    category_id: number;
    position: number;
  }> = Array.isArray(body.placements) ? body.placements : [];

  await ensureDb();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM placements WHERE user_id = $1", [
      session.userId,
    ]);
    for (const p of incoming) {
      const cocktailId = Number(p.cocktail_id);
      const categoryId = Number(p.category_id);
      const position = Number(p.position) || 0;
      if (!cocktailId || !categoryId) continue;
      await client.query(
        `INSERT INTO placements (user_id, cocktail_id, category_id, position, updated_at)
         VALUES ($1, $2, $3, $4, now())`,
        [session.userId, cocktailId, categoryId, position],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true });
}
