import { vi } from "vitest";

type MockQueryResult = { data: unknown; error: null } | { data: null; error: { message: string } };

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
};

function createMockChain(resolvedValue: MockQueryResult): MockChain {
  const chain: MockChain = {} as MockChain;
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "not", "or", "ilike",
    "order", "limit", "single", "then",
  ] as const;

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  chain.then = vi.fn().mockImplementation((resolve) => resolve(resolvedValue));

  // Make chain itself thenable so `await supabase.from(...).select(...)` works
  (chain as any)[Symbol.for("nodejs.util.promisify.custom")] = undefined;
  Object.defineProperty(chain, "then", {
    value: vi.fn().mockImplementation((resolve) => Promise.resolve(resolvedValue).then(resolve)),
    writable: true,
    configurable: true,
  });

  return chain;
}

export type TableDataMap = Record<string, unknown[]>;

export function createMockSupabase(tableData: TableDataMap = {}) {
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    const data = tableData[table] ?? [];
    const result: MockQueryResult = { data, error: null };
    const chain = createMockChain(result);

    // Override select to return array by default (not single)
    chain.select = vi.fn().mockReturnValue({
      ...chain,
      then: vi.fn().mockImplementation((resolve: (v: MockQueryResult) => void) =>
        Promise.resolve(result).then(resolve)
      ),
      eq: vi.fn().mockReturnValue({
        ...chain,
        then: vi.fn().mockImplementation((resolve: (v: MockQueryResult) => void) =>
          Promise.resolve(result).then(resolve)
        ),
      }),
    });

    // Override insert to return single item
    chain.insert = vi.fn().mockReturnValue({
      ...chain,
      select: vi.fn().mockReturnValue({
        ...chain,
        single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null }),
      }),
    });

    return chain;
  });

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://mock-signed-url.com/file" } }),
      upload: vi.fn().mockResolvedValue({ data: { path: "mock/path" }, error: null }),
    }),
  };

  return {
    from: mockFrom,
    storage: mockStorage,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

export function mockSupabaseModule(tableData: TableDataMap = {}) {
  const mockClient = createMockSupabase(tableData);

  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue(mockClient),
  }));

  return mockClient;
}

export function mockClerkAuth(userId = "test-user-123") {
  vi.mock("@clerk/nextjs/server", () => ({
    auth: vi.fn().mockResolvedValue({ userId }),
    currentUser: vi.fn().mockResolvedValue({
      id: userId,
      fullName: "Test User",
      firstName: "Test",
      emailAddresses: [{ emailAddress: "test@fyndstudio.com" }],
      imageUrl: null,
    }),
  }));
}

export function mockNextCache() {
  vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  }));
}
