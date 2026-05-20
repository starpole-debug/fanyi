import { NextResponse } from "next/server";
import { getTranslation, initializeStorage } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initializeStorage();
  const { id } = await params;
  const record = await getTranslation(id);

  if (!record) {
    return NextResponse.json({ error: "记录不存在。" }, { status: 404 });
  }

  return NextResponse.json(record);
}
