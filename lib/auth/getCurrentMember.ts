import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/types/members";

export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (data as Member) ?? null;
}
