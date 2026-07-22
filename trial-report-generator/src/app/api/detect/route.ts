import { NextRequest, NextResponse } from "next/server";
import { detectType } from "@/lib/calc/detect";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const activeIngredient: string = body.activeIngredient ?? body.activeIngredients ?? "";
    const explicitType: string | undefined = body.explicitType || undefined;
    const result = detectType(activeIngredient, explicitType);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
