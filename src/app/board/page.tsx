import { redirect } from "next/navigation";
import { getSession, currentUserIsAdmin } from "@/lib/auth";
import { Board } from "@/components/Board";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = await currentUserIsAdmin();

  return (
    <Board
      currentUser={{ id: session.userId, username: session.username }}
      isAdmin={isAdmin}
    />
  );
}
