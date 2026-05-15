import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing actions
vi.mock("@/lib/supabase/server", () => {
  const mockChain = () => {
    const chain: Record<string, any> = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "in", "is", "not", "or", "ilike", "order", "limit", "single", "then", "upsert"];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = vi.fn().mockImplementation((resolve: any) =>
      Promise.resolve({ data: [], error: null }).then(resolve)
    );
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    return chain;
  };

  const supabase = {
    from: vi.fn().mockReturnValue(mockChain()),
    storage: { from: vi.fn().mockReturnValue({ createSignedUrl: vi.fn(), upload: vi.fn() }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return { createClient: vi.fn().mockResolvedValue(supabase) };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user" }),
  currentUser: vi.fn().mockResolvedValue({
    fullName: "Test User",
    emailAddresses: [{ emailAddress: "test@test.com" }],
    imageUrl: null,
  }),
}));

describe("tasks/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getClients is exported and callable", async () => {
    const { getClients } = await import("@/app/(app)/tasks/actions");
    expect(getClients).toBeDefined();
    expect(typeof getClients).toBe("function");
  });

  it("getProjects is exported and callable", async () => {
    const { getProjects } = await import("@/app/(app)/tasks/actions");
    expect(getProjects).toBeDefined();
    expect(typeof getProjects).toBe("function");
  });

  it("getProfiles is exported and callable", async () => {
    const { getProfiles } = await import("@/app/(app)/tasks/actions");
    expect(getProfiles).toBeDefined();
    expect(typeof getProfiles).toBe("function");
  });

  it("createTask is exported and callable", async () => {
    const { createTask } = await import("@/app/(app)/tasks/actions");
    expect(createTask).toBeDefined();
    expect(typeof createTask).toBe("function");
  });

  it("moveTask is exported and callable", async () => {
    const { moveTask } = await import("@/app/(app)/tasks/actions");
    expect(moveTask).toBeDefined();
    expect(typeof moveTask).toBe("function");
  });

  it("getColumns is exported and callable", async () => {
    const { getColumns } = await import("@/app/(app)/tasks/actions");
    expect(getColumns).toBeDefined();
    expect(typeof getColumns).toBe("function");
  });

  it("getTaskDetail is exported and callable", async () => {
    const { getTaskDetail } = await import("@/app/(app)/tasks/actions");
    expect(getTaskDetail).toBeDefined();
    expect(typeof getTaskDetail).toBe("function");
  });

  it("exports all expected CRUD functions", async () => {
    const actions = await import("@/app/(app)/tasks/actions");
    const expectedExports = [
      "getClients", "getProjects", "createProject", "renameProject", "deleteProject",
      "getColumns", "createColumn", "updateColumn", "deleteColumn",
      "createTask", "updateTask", "deleteTask", "moveTask",
      "getTaskDetail", "getProfiles",
      "addAssignee", "removeAssignee",
      "addComment", "deleteComment",
      "uploadAttachment", "deleteAttachment",
      "uploadOutput", "deleteOutput",
      "addLink", "deleteLink",
      "createSubtask", "updateSubtaskAction", "deleteSubtask", "reorderSubtasks",
      "swapColumnPositions", "updateColumnMeta", "seedDefaultColumns",
    ];
    for (const name of expectedExports) {
      expect(actions).toHaveProperty(name);
      expect(typeof (actions as Record<string, unknown>)[name]).toBe("function");
    }
  });
});
