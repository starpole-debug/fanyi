"use client";

import { useState, useTransition } from "react";

type Props = {
  defaultTargetLanguage: string;
  configuredProviders: string[];
  activeProviderLabel: string;
};

type TranslateResponse = {
  id: string;
  outputText: string;
  status: string;
};

export function TranslatorForm({ defaultTargetLanguage, configuredProviders, activeProviderLabel }: Props) {
  const [originalText, setOriginalText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [contextText, setContextText] = useState("");
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>即时翻译</h2>
          <p className="meta-text">当前走的是 {activeProviderLabel}。后台切一次，前台就会跟着用新的 AI。</p>
        </div>
      </div>

      <form action={onSubmit} className="field-grid">
        <div className="field">
          <label htmlFor="originalText">原文</label>
          <textarea
            id="originalText"
            name="originalText"
            value={originalText}
            onChange={(event) => setOriginalText(event.target.value)}
            placeholder="把你要翻译的内容贴进来"
            required
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="sourceLanguage">源语言</label>
            <input
              id="sourceLanguage"
              name="sourceLanguage"
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
              placeholder="auto / zh / en"
            />
          </div>
          <div className="field">
            <label htmlFor="targetLanguage">目标语言</label>
            <input
              id="targetLanguage"
              name="targetLanguage"
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              placeholder="ja / en / zh-CN"
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="contextText">上下文</label>
          <textarea
            id="contextText"
            name="contextText"
            value={contextText}
            onChange={(event) => setContextText(event.target.value)}
            placeholder="可选。比如客户上一句说了什么，或者这段话所在的场景。"
          />
        </div>

        <div className="button-row">
          <button className="btn" type="submit" disabled={isPending}>
            {isPending ? "翻译中..." : "开始翻译"}
          </button>
          <span className="hint">已配置提供商：{configuredProviders.join(" / ") || "暂无"}</span>
        </div>
      </form>

      {error ? <div className="callout callout-danger">{error}</div> : null}

      {result ? (
        <div className="section">
          <div className="section-head">
            <h3>翻译结果</h3>
            <span className="mono">{result.id}</span>
          </div>
          <div className="output-box">{result.outputText}</div>
        </div>
      ) : null}
    </section>
  );
}
