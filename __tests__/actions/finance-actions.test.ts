import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => {
  const mockChain = () => {
    const chain: Record<string, any> = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "in", "is", "not", "or", "ilike", "order", "limit", "single", "then", "upsert", "gte", "lte"];
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

describe("finance/actions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("getVendors is exported and callable", async () => {
    const { getVendors } = await import("@/app/(app)/finance/actions");
    expect(getVendors).toBeDefined();
    expect(typeof getVendors).toBe("function");
  });

  it("getPurchaseOrders is exported and callable", async () => {
    const { getPurchaseOrders } = await import("@/app/(app)/finance/actions");
    expect(getPurchaseOrders).toBeDefined();
    expect(typeof getPurchaseOrders).toBe("function");
  });

  it("getExpenses is exported and callable", async () => {
    const { getExpenses } = await import("@/app/(app)/finance/actions");
    expect(getExpenses).toBeDefined();
    expect(typeof getExpenses).toBe("function");
  });

  it("getInvoices is exported and callable", async () => {
    const { getInvoices } = await import("@/app/(app)/finance/actions");
    expect(getInvoices).toBeDefined();
    expect(typeof getInvoices).toBe("function");
  });

  it("exports all expected CRUD functions", async () => {
    const actions = await import("@/app/(app)/finance/actions");
    const expectedExports = [
      "getVendors", "createVendor", "updateVendor", "deleteVendor",
      "getPurchaseOrders", "createPurchaseOrder", "updatePOStatus", "deletePurchaseOrder",
      "getExpenses", "createExpense", "updateExpense", "deleteExpense",
      "getInvoices", "createInvoice", "updateInvoiceStatus",
    ];
    for (const name of expectedExports) {
      expect(actions).toHaveProperty(name);
      expect(typeof (actions as Record<string, unknown>)[name]).toBe("function");
    }
  });
});
