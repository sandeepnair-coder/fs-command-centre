import { describe, it, expect, vi, beforeEach } from "vitest";

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

  return {
    createClient: vi.fn().mockResolvedValue({
      from: vi.fn().mockReturnValue(mockChain()),
      storage: { from: vi.fn().mockReturnValue({ createSignedUrl: vi.fn(), upload: vi.fn() }) },
    }),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user" }),
  currentUser: vi.fn().mockResolvedValue({ fullName: "Test", emailAddresses: [{ emailAddress: "t@t.com" }], imageUrl: null }),
}));

describe("comms/actions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("getConversations is exported and callable", async () => {
    const { getConversations } = await import("@/app/(app)/comms/actions");
    expect(getConversations).toBeDefined();
    expect(typeof getConversations).toBe("function");
  });

  it("getMessages is exported and callable", async () => {
    const { getMessages } = await import("@/app/(app)/comms/actions");
    expect(getMessages).toBeDefined();
    expect(typeof getMessages).toBe("function");
  });

  it("updateConversationStatus is exported and callable", async () => {
    const { updateConversationStatus } = await import("@/app/(app)/comms/actions");
    expect(updateConversationStatus).toBeDefined();
    expect(typeof updateConversationStatus).toBe("function");
  });

  it("linkConversationToClient is exported and callable", async () => {
    const { linkConversationToClient } = await import("@/app/(app)/comms/actions");
    expect(linkConversationToClient).toBeDefined();
    expect(typeof linkConversationToClient).toBe("function");
  });

  it("exports all expected functions", async () => {
    const actions = await import("@/app/(app)/comms/actions");
    const expectedExports = [
      "getConversations", "getConversationById", "getMessages",
      "updateConversationStatus", "updateConversationPriority",
      "linkConversationToClient", "getClientCrmInsight",
      "setFollowUp", "classifyMessage", "linkTaskToConversation",
      "getProjectColumns",
    ];
    for (const name of expectedExports) {
      expect(actions).toHaveProperty(name);
      expect(typeof (actions as Record<string, unknown>)[name]).toBe("function");
    }
  });
});
