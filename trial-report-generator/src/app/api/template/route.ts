import { NextRequest, NextResponse } from "next/server";
import { analyzeTemplate } from "@/lib/report/analyze";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Файл юкланмади." }, { status: 400 });
    }
    const name = (file as File).name || "";
    if (!name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { ok: false, error: "Фақат .docx формат қабул қилинади." },
        { status: 400 },
      );
    }
    const arrayBuffer = await (file as File).arrayBuffer();
    const analysis = analyzeTemplate(Buffer.from(arrayBuffer));
    return NextResponse.json({ ok: true, fileName: name, analysis });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
