import { NextRequest, NextResponse } from "next/server";
import { checkOpenClawHealth } from "@/lib/openclaw/client";

export async function GET() {
  const health = await checkOpenClawHealth();
  return NextResponse.json(health);
}
