import Link from "next/link";
import { reviewTranslationAction } from "@/app/admin/actions";
import { ScorePanel } from "@/components/score-panel";
import { requireAdmin } from "@/lib/auth";
import { getTranslation, initializeStorage } from "@/lib/storage";

export default async function TranslationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  await initializeStorage();

  const { id } = await params;
  const record = await getTranslation(id);

  if (!record) {
    return (
      <main className="shell">
        <section className="section">
          <h1>记录不存在</h1>
          <Link className="btn-secondary" href="/admin">
            返回后台
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <h1>编辑翻译记录</h1>
          <p className="meta-text mono">{record.id}</p>
        </div>
        <Link className="btn-secondary" href="/admin">
          返回后台
        </Link>
      </div>

      <div className="editor-layout">
        <section className="section">
          <h2>原始内容</h2>
          <div className="preview-box">{record.originalText}</div>
          <div className="field-row">
            <div className="panel">
              <strong>源语言</strong>
              <p>{record.sourceLanguage}</p>
            </div>
            <div className="panel">
              <strong>目标语言</strong>
              <p>{record.targetLanguage}</p>
            </div>
          </div>
          {record.contextText ? (
            <div>
              <span className="label">上下文</span>
              <div className="preview-box">{record.contextText}</div>
            </div>
          ) : null}
        </section>

        <section className="section">
          <h2>审核与修订</h2>
          <form action={reviewTranslationAction} className="field-grid">
            <input type="hidden" name="id" value={record.id} />
            <div className="field">
              <label htmlFor="reviewedText">可发布译文</label>
              <textarea
                id="reviewedText"
                name="reviewedText"
                defaultValue={record.reviewedText || record.outputText}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="status">状态</label>
              <select id="status" name="status" defaultValue={record.status}>
                <option value="draft">draft</option>
                <option value="approved">approved</option>
              </select>
            </div>
            <button className="btn" type="submit">
              保存审核结果
            </button>
          </form>
          <div>
            <span className="label">模型原始输出</span>
            <div className="output-box">{record.outputText}</div>
          </div>
          <ScorePanel translationId={record.id} />
        </section>
      </div>
    </main>
  );
}
