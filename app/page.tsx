import Link from "next/link";
import { getConfiguredProviders } from "@/lib/providers";
import { getSettings, listTranslations } from "@/lib/storage";
import { TranslatorForm } from "@/components/translator-form";

export default async function HomePage() {
  const settings = await getSettings();
  const translations = await listTranslations();
  const providers = getConfiguredProviders();

  return (
    <main className="shell">
      <section className="hero">
        <div className="section-head">
          <div>
            <h1>Translator Control Center</h1>
            <p className="meta-text">
              这版不再靠改文件切换 AI。密钥放 Vercel 环境变量，真正启用哪个提供商和模型，直接在后台页面改。
            </p>
          </div>
          <Link className="btn-secondary" href="/admin">
            打开后台
          </Link>
        </div>

        <div className="hero-grid">
          <TranslatorForm
            defaultTargetLanguage="ja"
            configuredProviders={providers.map((provider) => provider.label)}
            activeProviderLabel={providers.find((item) => item.key === settings.selectedProvider)?.label || "未配置"}
          />

          <div className="section">
            <h2>当前运行配置</h2>
            <div className="stats-grid">
              <div className="metric">
                <span>当前提供商</span>
                <strong>{settings.selectedProvider === "custom" ? settings.customProviderLabel : settings.selectedProvider}</strong>
              </div>
              <div className="metric">
                <span>翻译模型</span>
                <strong>{settings.translateModel}</strong>
              </div>
              <div className="metric">
                <span>可用提供商</span>
                <strong>{providers.length}</strong>
              </div>
            </div>
            <div className="callout">
              <strong>部署思路</strong>
              <p className="meta-text">
                生产环境建议接入 Vercel Postgres。这样后台切换 AI 提供商、模型和系统提示词都会持久化，不会随着部署丢失。
              </p>
            </div>
            <div className="section">
              <h3>最近翻译记录</h3>
              {translations.length === 0 ? (
                <div className="empty-state">还没有翻译记录。先试一条看看。</div>
              ) : (
                <div className="records-grid">
                  {translations.slice(0, 4).map((item) => (
                    <article className="record-card" key={item.id}>
                      <header>
                        <span className={`badge ${item.status === "approved" ? "badge-approved" : "badge-draft"}`}>
                          {item.status}
                        </span>
                        <span className="mono">{item.targetLanguage}</span>
                      </header>
                      <p>{item.originalText.slice(0, 80)}</p>
                      <div className="preview-box">{(item.reviewedText || item.outputText).slice(0, 120)}</div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
