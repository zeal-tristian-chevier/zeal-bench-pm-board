import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Root() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!hasEnv) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/board" : "/login");
}
