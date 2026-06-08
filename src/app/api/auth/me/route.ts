import { NextResponse } from "next/server";
import { getSession, currentUserIsAdmin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      is_admin: await currentUserIsAdmin(),
    },
  });
}
