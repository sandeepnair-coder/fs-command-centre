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
      storage: { from: vi.fn().mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://mock.url" } }), upload: vi.fn() }) },
    }),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user" }),
  currentUser: vi.fn().mockResolvedValue({ fullName: "Test", emailAddresses: [{ emailAddress: "t@t.com" }], imageUrl: null }),
}));

describe("clients/actions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("getClientStats is exported and callable", async () => {
    const { getClientStats } = await import("@/app/(app)/clients/actions");
    expect(getClientStats).toBeDefined();
    expect(typeof getClientStats).toBe("function");
  });

  it("createClientFull is exported and callable", async () => {
    const { createClientFull } = await import("@/app/(app)/clients/actions");
    expect(createClientFull).toBeDefined();
    expect(typeof createClientFull).toBe("function");
  });

  it("deleteClient is exported and callable", async () => {
    const { deleteClient } = await import("@/app/(app)/clients/actions");
    expect(deleteClient).toBeDefined();
    expect(typeof deleteClient).toBe("function");
  });

  it("exports all expected functions", async () => {
    const actions = await import("@/app/(app)/clients/actions");
    const expectedExports = [
      "getClientStats", "createClientFull", "deleteClient",
      "createClientContact", "upsertClientFact", "createBrandAsset",
      "batchCreateClientExtras",
    ];
    for (const name of expectedExports) {
      expect(actions).toHaveProperty(name);
      expect(typeof (actions as Record<string, unknown>)[name]).toBe("function");
    }
  });
});
