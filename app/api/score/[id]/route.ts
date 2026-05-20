import { NextResponse } from "next/server";
import { scoreTranslation } from "@/lib/ai";
import { getTranslation, initializeStorage } from "@/lib/storage";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeStorage();
    const { id } = await params;
    const record = await getTranslation(id);

    if (!record) {
      return NextResponse.json({ error: "记录不存在。" }, { status: 404 });
    }

    const result = await scoreTranslation({
      originalText: record.originalText,
      candidateText: record.reviewedText || record.outputText,
      sourceLanguage: record.sourceLanguage,
      targetLanguage: record.targetLanguage
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "评分失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
