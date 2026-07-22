import { NextRequest, NextResponse } from "next/server";
import { computeReport } from "@/lib/compute";
import type { ReportInput } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as ReportInput;
    if (!input?.meta || !input?.variants || !input?.assessment) {
      return NextResponse.json(
        { ok: false, error: "Маълумот тўлиқ эмас: meta, variants ва assessment керак." },
        { status: 400 },
      );
    }
    const report = computeReport(input);
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
