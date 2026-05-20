"use client";

import { useState, useTransition } from "react";

type Props = {
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  configuredProviders: string[];
  activeProviderLabel: string;
};

type TranslateResponse = {
  id: string;
  outputText: string;
  status: string;
};

export function TranslatorForm({
  defaultSourceLanguage,
  defaultTargetLanguage,
  configuredProviders,
  activeProviderLabel
}: Props) {
  const [originalText, setOriginalText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [contextText, setContextText] = useState("");
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function swapLanguages() {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  }

  function onSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: formData.get("originalText"),
          sourceLanguage: formData.get("sourceLanguage"),
          targetLanguage: formData.get("targetLanguage"),
          contextText: formData.get("contextText")
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(payload.error || "翻译失败。");
        return;
      }

      setResult(payload);
    });
  }

  async function copyResult() {
    if (!result?.outputText) return;
    try {
      await navigator.clipboard.writeText(result.outputText);
    } catch {
      setError("复制失败，请手动选择文本复制。");
    }
  }

  function clearSource() {
    setOriginalText("");
  }

  return (
    <section className="translator-panel">
      <form action={onSubmit} className="translator-form">
        <div className="language-bar">
          <label className="language-field" htmlFor="sourceLanguage">
            <span>源语言</span>
            <input
              id="sourceLanguage"
              name="sourceLanguage"
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
              placeholder="zh"
            />
          </label>
          <button className="swap-button" type="button" onClick={swapLanguages} aria-label="互换语言">
            ⇄
          </button>
          <label className="language-field" htmlFor="targetLanguage">
            <span>目标语言</span>
            <input
              id="targetLanguage"
              name="targetLanguage"
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              placeholder="ja"
              required
            />
          </label>
          <div className="ready-badge">Ready for translation</div>
        </div>

        <div className="translate-grid">
          <label className="text-pane" htmlFor="originalText">
            <div className="pane-head">
              <span>原文</span>
              <button className="pane-action" type="button" onClick={clearSource}>
                清空
              </button>
            </div>
            <textarea
              id="originalText"
              name="originalText"
              value={originalText}
              onChange={(event) => setOriginalText(event.target.value)}
              placeholder="输入要翻译的内容"
              required
            />
          </label>

          <div className="text-pane output-pane">
            <div className="pane-head">
              <span>译文</span>
              <button className="pane-action" type="button" onClick={copyResult}>
                复制
              </button>
            </div>
            <div className="translation-output">
              {isPending ? "翻译中..." : result?.outputText || "译文会显示在这里"}
            </div>
          </div>
        </div>

        <label className="context-field" htmlFor="contextText">
          <span>上下文</span>
          <input
            id="contextText"
            name="contextText"
            value={contextText}
            onChange={(event) => setContextText(event.target.value)}
            placeholder="可选"
          />
        </label>

        <div className="translator-actions">
          <button className="secondary-action" type="button">
            保存配置
          </button>
          <button className="primary-action" type="submit" disabled={isPending}>
            {isPending ? "翻译中" : "翻译"}
          </button>
        </div>
      </form>

      <div className="status-note">当前提供商：{activeProviderLabel} · 已配置：{configuredProviders.join(" / ") || "暂无"}</div>
      {error ? <div className="callout callout-danger">{error}</div> : null}
    </section>
  );
}
