"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";
import type { Member, MemberRole } from "@/lib/types/members";

export async function getMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return (data || []) as Member[];
}

export async function inviteMember(email: string, role: MemberRole) {
  const current = await getCurrentMember();
  if (!current || (current.role !== "owner" && current.role !== "admin")) {
    throw new Error("Only owners and admins can invite members");
  }

  const supabase = await createClient();

  // Check if member already exists
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) throw new Error("This email is already a member");

  const { data, error } = await supabase
    .from("members")
    .insert({
      email: email.trim().toLowerCase(),
      role,
      status: "invited",
      full_name: email.split("@")[0],
    })
    .select()
    .single();

  if (error) throw error;
  return data as Member;
}

export async function changeMemberRole(memberId: string, newRole: MemberRole) {
  const current = await getCurrentMember();
  if (!current || (current.role !== "owner" && current.role !== "admin")) {
    throw new Error("Only owners and admins can change roles");
  }

  // Can't change owner's role
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (target?.role === "owner") throw new Error("Cannot change the owner's role");

  // Only owner can make someone admin
  if (newRole === "admin" && current.role !== "owner") {
    throw new Error("Only the owner can promote to admin");
  }

  // Can't make someone owner
  if (newRole === "owner") throw new Error("Use transfer ownership instead");

  const { error } = await supabase
    .from("members")
    .update({ role: newRole })
    .eq("id", memberId);

  if (error) throw error;
}

export async function toggleMemberStatus(memberId: string) {
  const current = await getCurrentMember();
  if (!current || (current.role !== "owner" && current.role !== "admin")) {
    throw new Error("Only owners and admins can change member status");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("members")
    .select("status, role")
    .eq("id", memberId)
    .single();

  if (!target) throw new Error("Member not found");
  if (target.role === "owner") throw new Error("Cannot deactivate the owner");

  const newStatus = target.status === "active" ? "disabled" : "active";
  const { error } = await supabase
    .from("members")
    .update({ status: newStatus })
    .eq("id", memberId);

  if (error) throw error;
  return newStatus;
}

export async function removeMember(memberId: string) {
  const current = await getCurrentMember();
  if (!current || (current.role !== "owner" && current.role !== "admin")) {
    throw new Error("Only owners and admins can remove members");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (target?.role === "owner") throw new Error("Cannot remove the owner");

  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}
