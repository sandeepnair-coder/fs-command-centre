import { NextRequest } from "next/server";
import { verifyAgentAuth, apiError, apiSuccess } from "@/lib/api/auth";
import { UpsertClientSchema } from "@/lib/api/schemas";
import { upsertClient } from "@/lib/services/client-service";

export async function POST(req: NextRequest) {
  const auth = verifyAgentAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = UpsertClientSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues.map((i) => `${i.path.join(".")}:\ ${i.message}`).join("; "));
    }
    const result = await upsertClient(parsed.data);
    return apiSuccess(result, "deduplicated" in result ? 200 : 201);
  } catch (err) {
    return apiError("INTERNAL_ERROR", (err as Error).message, 500);
  }
}
