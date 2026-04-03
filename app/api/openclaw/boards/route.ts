import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENCLAW_API_TOKEN = process.env.OPENCLAW_API_TOKEN;

function verifyAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth || !OPENCLAW_API_TOKEN) return false;
  return auth.replace("Bearer ", "") === OPENCLAW_API_TOKEN;
}

// GET /api/openclaw/boards — List boards and their columns
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, status, clients(name)")
    .eq("status", "active")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch columns for each project
  const projectIds = (projects || []).map((p) => p.id);
  const { data: columns } = await supabase
    .from("project_columns")
    .select("id, name, project_id, position")
    .in("project_id", projectIds)
    .order("position");

  const colsByProject: Record<string, { id: string; name: string }[]> = {};
  (columns || []).forEach((c) => {
    if (!colsByProject[c.project_id]) colsByProject[c.project_id] = [];
    colsByProject[c.project_id].push({ id: c.id, name: c.name });
  });

  return NextResponse.json({
    ok: true,
    boards: (projects || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      client: (p.clients as unknown as { name: string })?.name || null,
      columns: colsByProject[p.id] || [],
    })),
  });
}
