import Link from "next/link";
import { getConfiguredProviders } from "@/lib/providers";
import { getSettings } from "@/lib/storage";
import { TranslatorForm } from "@/components/translator-form";

export default async function HomePage() {
  const settings = await getSettings();
  const providers = getConfiguredProviders();

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-title-block">
          <p className="app-kicker">AI Translation Workspace</p>
          <h1>Translator Control Center</h1>
          <p className="app-subtitle">轻量、清晰、耐用的内部翻译工作台</p>
        </div>
        <Link className="icon-link" href="/admin" aria-label="打开后台">
          <span aria-hidden="true">⚙</span>
          <span>后台</span>
        </Link>
      </header>

      <section className="translator-workbench">
        <TranslatorForm
          defaultSourceLanguage="zh"
          defaultTargetLanguage="ja"
          configuredProviders={providers.map((provider) => provider.label)}
          activeProviderLabel={providers.find((item) => item.key === settings.selectedProvider)?.label || "未配置"}
        />
      </section>
    </main>
  );
}
