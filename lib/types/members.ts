export type MemberRole = "owner" | "member" | "finance";
export type MemberStatus = "invited" | "active" | "disabled";

export type Member = {
  id: string;
  user_id: string | null;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; avatar_url: string | null } | null;
};
