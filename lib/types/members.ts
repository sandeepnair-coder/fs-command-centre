export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type MemberStatus = "invited" | "active" | "disabled";

export type Member = {
  id: string;
  user_id: string | null;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  clerk_id?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  profiles?: { full_name: string; avatar_url: string | null } | null;
};

export const ROLE_CONFIG: Record<MemberRole, { label: string; color: string; badge: string }> = {
  owner: { label: "Owner", color: "text-amber-700", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  admin: { label: "Admin", color: "text-violet-700", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  member: { label: "Member", color: "text-blue-700", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  viewer: { label: "Viewer", color: "text-gray-500", badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};
