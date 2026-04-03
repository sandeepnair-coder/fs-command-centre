import { NextRequest, NextResponse } from "next/server";

const OPENCLAW_API_TOKEN = process.env.OPENCLAW_API_TOKEN;

export function verifyAgentAuth(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const auth = req.headers.get("authorization");
  if (!auth || !OPENCLAW_API_TOKEN) {
    return { ok: false, response: NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" } }, { status: 401 }) };
  }
  const token = auth.replace("Bearer ", "");
  if (token !== OPENCLAW_API_TOKEN) {
    return { ok: false, response: NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 }) };
  }
  return { ok: true };
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}
