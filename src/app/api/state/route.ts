import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Returns the entire shared board state. The client polls this to stay live.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [users, cocktails, categories, placements, notes] = await Promise.all([
    query("SELECT id, username FROM users ORDER BY id"),
    query(
      "SELECT id, name, recipe, base_spirit, base_spirits, created_by, created_at, updated_at FROM cocktails ORDER BY id",
    ),
    query(
      "SELECT id, name, position, created_at FROM categories ORDER BY position, id",
    ),
    query(
      "SELECT user_id, cocktail_id, category_id, position FROM placements",
    ),
    query(
      `SELECT n.cocktail_id, n.user_id, u.username, n.body, n.updated_at
         FROM notes n JOIN users u ON u.id = n.user_id
        WHERE n.body <> ''
        ORDER BY n.updated_at`,
    ),
  ]);

  return NextResponse.json({ users, cocktails, categories, placements, notes });
}
