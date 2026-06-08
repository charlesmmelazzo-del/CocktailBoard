import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Temporary diagnostic endpoint. Reports whether the database is reachable
// without exposing any secret values. Safe to remove once deployment is healthy.
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasSessionSecret = Boolean(process.env.SESSION_SECRET);

  let db: "ok" | "error" = "error";
  let error: string | null = null;
  try {
    await query("SELECT 1");
    db = "ok";
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 200) : "unknown error";
  }

  return NextResponse.json({ hasDatabaseUrl, hasSessionSecret, db, error });
}
