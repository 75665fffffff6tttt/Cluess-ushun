import { NextRequest, NextResponse } from "next/server";
import { computeReport } from "@/lib/compute";
import { buildReportDocx } from "@/lib/report/docx";
import type { ReportInput } from "@/lib/types";

export const runtime = "nodejs";

function safeFileName(s: string): string {
  return (s || "hisobot")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

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
    const buffer = await buildReportDocx(report, input.meta);
    const fname = safeFileName(input.meta.preparatName) + "_davlat_sinov_hisoboti.docx";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
