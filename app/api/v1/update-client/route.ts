import { NextRequest } from "next/server";
import { verifyAgentAuth, apiError, apiSuccess } from "@/lib/api/auth";
import { UpdateClientSchema } from "@/lib/api/schemas";
import { updateClientByAgent } from "@/lib/services/client-service";

export async function POST(req: NextRequest) {
  const auth = verifyAgentAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = UpdateClientSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues.map((i) => `${i.path.join(".")}:\ ${i.message}`).join("; "));
    }
    const result = await updateClientByAgent(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    return apiError("INTERNAL_ERROR", (err as Error).message, 500);
  }
}
