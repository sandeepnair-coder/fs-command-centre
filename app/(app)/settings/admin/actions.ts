"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { MemberRole } from "@/lib/types/members";

export async function getMembers() {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at");
  if (error) throw error;

  // Fetch profiles for linked members in a separate query
  const userIds = (members || [])
    .map((m) => m.user_id)
    .filter(Boolean) as string[];

  let profileMap: Record<
    string,
    { full_name: string; avatar_url: string | null }
  > = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    (profiles || []).forEach((p) => {
      profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
    });
  }

  return (members || []).map((m) => ({
    ...m,
    profiles: m.user_id ? profileMap[m.user_id] ?? null : null,
  }));
}

export async function inviteMember(email: string, role: MemberRole) {
  if (!email?.trim()) throw new Error("Email is required");

  const supabase = await createClient();

  // Upsert: if email already exists (e.g., was disabled and re-invited), update
  const { error: upsertError } = await supabase.from("members").upsert(
    { email: email.trim().toLowerCase(), role, status: "invited", user_id: null },
    { onConflict: "email" }
  );
  if (upsertError) throw upsertError;

  // Send invite email via admin API (requires service role)
  const serviceClient = createServiceClient();
  const { error: inviteError } =
    await serviceClient.auth.admin.inviteUserByEmail(email.trim().toLowerCase());
  if (inviteError) throw inviteError;

  revalidatePath("/settings/admin");
}

export async function changeMemberRole(memberId: string, role: MemberRole) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ role })
    .eq("id", memberId);
  if (error) throw error;
  revalidatePath("/settings/admin");
}

export async function toggleMemberStatus(memberId: string, disable: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ status: disable ? "disabled" : "active" })
    .eq("id", memberId);
  if (error) throw error;
  revalidatePath("/settings/admin");
}
