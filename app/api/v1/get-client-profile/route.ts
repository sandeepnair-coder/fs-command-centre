import { NextRequest } from "next/server";
import { verifyAgentAuth, apiError, apiSuccess } from "@/lib/api/auth";
import { GetClientProfileSchema } from "@/lib/api/schemas";
import { getClientProfile } from "@/lib/services/client-service";

export async function POST(req: NextRequest) {
  const auth = verifyAgentAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = GetClientProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues.map((i) => `${i.path.join(".")}:\ ${i.message}`).join("; "));
    }
    const result = await getClientProfile(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    return apiError("INTERNAL_ERROR", (err as Error).message, 500);
  }
}
