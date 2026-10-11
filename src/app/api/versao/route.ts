import { NextResponse } from "next/server";
import { versaoApp } from "@/lib/versao";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ versao: versaoApp() }, { headers: { "Cache-Control": "no-store" } });
}
