import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BoardShell from "@/components/BoardShell";

export default async function BoardPage() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasEnv) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <BoardShell userEmail={user.email ?? ""} />;
}
