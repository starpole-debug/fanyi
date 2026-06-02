import { NextResponse } from "next/server";
import { createTranslation, initializeStorage } from "@/lib/storage";
import { translateText } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    await initializeStorage();
    const body = await request.json();
    const originalText = String(body.originalText || "").trim();
    const targetLanguage = String(body.targetLanguage || "ja").trim();
    const sourceLanguage = String(body.sourceLanguage || "auto").trim();
    const contextText = String(body.contextText || "").trim();

    if (!originalText) {
      return NextResponse.json({ error: "originalText 不能为空。" }, { status: 400 });
    }

    const record = await translateText({
      originalText,
      sourceLanguage,
      targetLanguage,
      contextText
    });

    await createTranslation(record);
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "翻译失败。";
    console.error("[api.translate] translate failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
