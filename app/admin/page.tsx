import Link from "next/link";
import { deleteTranslationAction, logoutAction, updateSettingsAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { getConfiguredProviders, PROVIDERS } from "@/lib/providers";
import { getSettings, initializeStorage, listTranslations } from "@/lib/storage";

export default async function AdminPage() {
  await requireAdmin();
  await initializeStorage();

  const settings = await getSettings();
  const translations = await listTranslations();
  const configuredProviders = getConfiguredProviders();

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <h1>后台控制台</h1>
          <p className="meta-text">这里就是你以后切 AI、改模型、查记录、修译文的地方。</p>
        </div>
        <div className="inline-actions">
          <Link className="btn-secondary" href="/">
            前台预览
          </Link>
          <form action={logoutAction}>
            <button className="btn-danger" type="submit">
              退出登录
            </button>
          </form>
        </div>
      </div>

      <div className="admin-layout">
        <section className="section">
          <h2>AI 设置</h2>
          <form action={updateSettingsAction} className="field-grid">
            <div className="field">
              <label htmlFor="selectedProvider">当前提供商</label>
              <select id="selectedProvider" name="selectedProvider" defaultValue={settings.selectedProvider}>
                {PROVIDERS.map((provider) => (
                  <option key={provider.key} value={provider.key}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="customProviderLabel">自定义提供商名称</label>
                <input
                  id="customProviderLabel"
                  name="customProviderLabel"
                  defaultValue={settings.customProviderLabel}
                  placeholder="例如 My Proxy / OneAPI / NewAPI"
                />
              </div>
              <div className="field">
                <label htmlFor="customApiKeyEnv">自定义 API Key 环境变量名</label>
                <input
                  id="customApiKeyEnv"
                  name="customApiKeyEnv"
                  defaultValue={settings.customApiKeyEnv}
                  placeholder="例如 CUSTOM_AI_API_KEY"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="customBaseUrl">自定义 Base URL</label>
              <input
                id="customBaseUrl"
                name="customBaseUrl"
                defaultValue={settings.customBaseUrl}
                placeholder="例如 https://your-proxy.example.com/v1"
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="translateModel">翻译模型</label>
                <input id="translateModel" name="translateModel" defaultValue={settings.translateModel} required />
              </div>
              <div className="field">
                <label htmlFor="polishModel">润色模型</label>
                <input id="polishModel" name="polishModel" defaultValue={settings.polishModel} required />
              </div>
            </div>

            <div className="field">
              <label htmlFor="scoringModel">评分模型</label>
              <input id="scoringModel" name="scoringModel" defaultValue={settings.scoringModel} required />
            </div>

            <div className="field">
              <label htmlFor="systemPrompt">系统提示词</label>
              <textarea id="systemPrompt" name="systemPrompt" defaultValue={settings.systemPrompt} required />
            </div>

            <div className="field">
              <label htmlFor="adminThemeNote">后台备注</label>
              <textarea
                id="adminThemeNote"
                name="adminThemeNote"
                defaultValue={settings.adminThemeNote}
                placeholder="给未来的自己留一句话，比如这个站当前主要用于哪类翻译。"
              />
            </div>

            <button className="btn" type="submit">
              保存后台设置
            </button>
          </form>
        </section>

        <section className="section">
          <h2>部署提醒</h2>
          <div className="callout">
            <strong>已检测到的 API Key</strong>
            <p className="meta-text">
              {configuredProviders.length > 0
                ? configuredProviders.map((provider) => provider.label).join(" / ")
                : "当前还没有检测到任何提供商密钥。"}
            </p>
          </div>
          <div className="callout">
            <strong>第三方 URL 说明</strong>
            <p className="meta-text">
              如果你用的是第三方 OpenAI 兼容接口，就把“当前提供商”切到 `custom`，然后填 `Base URL`
              和对应的 API Key 环境变量名。
            </p>
          </div>
          <div className="callout">
            <strong>持久化状态</strong>
            <p className="meta-text">
              本地无 `POSTGRES_URL` 时会退回 JSON 文件；部署到 Vercel 后，请接上 Postgres，这样后台设置和翻译记录才会稳定保存。
            </p>
          </div>
          <div className="callout">
            <strong>当前备注</strong>
            <p className="meta-text">{settings.adminThemeNote}</p>
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>翻译记录</h2>
          <span className="meta-text">{translations.length} 条</span>
        </div>
        {translations.length === 0 ? (
          <div className="empty-state">还没有记录，先回前台试几条翻译。</div>
        ) : (
          <div className="records-grid">
            {translations.map((item) => (
              <article className="record-card" key={item.id}>
                <header>
                  <span className={`badge ${item.status === "approved" ? "badge-approved" : "badge-draft"}`}>
                    {item.status}
                  </span>
                  <span className="mono">{item.targetLanguage}</span>
                </header>
                <p>{item.originalText.slice(0, 100)}</p>
                <div className="preview-box">{(item.reviewedText || item.outputText).slice(0, 160)}</div>
                <div className="inline-actions">
                  <Link className="btn-secondary" href={`/admin/translations/${item.id}`}>
                    编辑记录
                  </Link>
                  <form action={deleteTranslationAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="btn-danger" type="submit">
                      删除
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
