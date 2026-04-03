import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENCLAW_API_TOKEN = process.env.OPENCLAW_API_TOKEN;

// Verify the request comes from Open Claw
function verifyAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth || !OPENCLAW_API_TOKEN) return false;
  const token = auth.replace("Bearer ", "");
  return token === OPENCLAW_API_TOKEN;
}

// POST /api/openclaw/tasks — Create a task card
export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, board, column, description, priority, due_date, client_name } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Resolve board by name
    let projectId: string | null = null;
    if (board) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .ilike("name", `%${board}%`)
        .limit(1);
      projectId = projects?.[0]?.id || null;
    }

    if (!projectId) {
      // Fall back to first active project
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("status", "active")
        .limit(1);
      projectId = projects?.[0]?.id || null;
    }

    if (!projectId) {
      return NextResponse.json({ error: "No board found. Specify a valid board name." }, { status: 404 });
    }

    // Resolve column by name (or use first column)
    let columnId: string | null = null;
    const { data: columns } = await supabase
      .from("project_columns")
      .select("id, name")
      .eq("project_id", projectId)
      .order("position");

    if (column && columns) {
      const match = columns.find((c) =>
        c.name.toLowerCase().includes(column.toLowerCase())
      );
      columnId = match?.id || columns[0]?.id || null;
    } else {
      columnId = columns?.[0]?.id || null;
    }

    if (!columnId) {
      return NextResponse.json({ error: "No columns found on this board." }, { status: 404 });
    }

    // Resolve client by name
    let clientId: string | null = null;
    if (client_name) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id")
        .ilike("name", `%${client_name}%`)
        .limit(1);
      clientId = clients?.[0]?.id || null;
    }

    // Get max position
    const { data: existing } = await supabase
      .from("tasks")
      .select("position")
      .eq("column_id", columnId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = existing?.[0] ? existing[0].position + 1000 : 0;

    // Create the task
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        column_id: columnId,
        title,
        description: description || null,
        priority: priority || "low",
        due_date: due_date || null,
        client_id: clientId,
        position: nextPos,
      })
      .select("id, title, project_id, column_id, priority, due_date, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("audit_log_events").insert({
      actor_type: "connector",
      event_type: "task_created_by_openclaw",
      entity_type: "task",
      entity_id: task.id,
      metadata_json: JSON.stringify({ title, board, column }),
    });

    const boardName = (await supabase.from("projects").select("name").eq("id", projectId).single()).data?.name;
    const colName = columns?.find((c) => c.id === columnId)?.name;

    return NextResponse.json({
      ok: true,
      task: {
        id: task.id,
        title: task.title,
        board: boardName,
        column: colName,
        priority: task.priority,
        due_date: task.due_date,
        created_at: task.created_at,
      },
      message: `Task "${title}" created in ${boardName} → ${colName}`,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// GET /api/openclaw/tasks — List tasks (for Open Claw to read board state)
export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const board = searchParams.get("board");
  const limit = parseInt(searchParams.get("limit") || "50");

  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("id, title, priority, due_date, column_id, project_id, client_id, created_at, projects(name), project_columns(name), clients(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (board) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .ilike("name", `%${board}%`)
      .limit(1);
    if (projects?.[0]) {
      query = query.eq("project_id", projects[0].id);
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    tasks: (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      due_date: t.due_date,
      board: (t.projects as unknown as { name: string })?.name,
      column: (t.project_columns as unknown as { name: string })?.name,
      client: (t.clients as unknown as { name: string })?.name,
      created_at: t.created_at,
    })),
  });
}
