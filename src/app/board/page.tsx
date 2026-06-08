import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Board } from "@/components/Board";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Board currentUser={{ id: session.userId, username: session.username }} />
  );
}
