import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BoardShell from "@/components/BoardShell";

export default async function BoardPage() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!hasEnv) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (user.email ? user.email.split("@")[0] : "") ||
    "";

  return (
    <BoardShell
      userEmail={user.email ?? ""}
      authUserId={user.id}
      avatarUrl={avatarUrl}
      displayName={displayName}
    />
  );
}
