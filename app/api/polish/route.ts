import { NextResponse } from "next/server";
import { polishText } from "@/lib/ai";
import { initializeStorage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    await initializeStorage();
    const body = await request.json();
    const text = String(body.text || "").trim();
    const style = String(body.style || "general_natural").trim();

    if (!text) {
      return NextResponse.json({ error: "text 不能为空。" }, { status: 400 });
    }

    const result = await polishText({ text, style });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "润色失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
