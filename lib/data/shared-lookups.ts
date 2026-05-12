import { createClient } from "@/lib/supabase/server";

export type ClientOption = { id: string; name: string };

export type ActiveMember = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  avatar_color: string | null;
  is_manager: boolean;
};

export async function getClientOptions(): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name")
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function getActiveMembers(): Promise<ActiveMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, avatar_url, clerk_id, email, is_manager, role")
    .eq("status", "active")
    .order("full_name");
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name || m.email?.split("@")[0] || "Unknown",
    avatar_url: m.avatar_url || null,
    avatar_color: null,
    is_manager: m.is_manager || m.role === "owner",
  }));
}

export async function generateSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn = 3600
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const result: Record<string, string> = {};
  const batchSize = 10;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(async (p) => {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(p, expiresIn);
        return { path: p, url: data?.signedUrl };
      })
    );
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value.url) {
        result[r.value.path] = r.value.url;
      }
    }
  }
  return result;
}

const COMPLETION_KEYWORDS = ["done", "approved", "completed", "closed"];

export function isCompletionColumn(columnName: string): boolean {
  const lower = columnName.toLowerCase();
  return COMPLETION_KEYWORDS.some((kw) => lower.includes(kw));
}
