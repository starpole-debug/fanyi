import { randomUUID } from "node:crypto";
import { getDefaultSettings } from "@/lib/defaults";
import { getProvider } from "@/lib/providers";
import { getSettings } from "@/lib/storage";
import { PolishResult, ScoreResult, TranslationRecord } from "@/lib/types";

function parseJson<T>(content: string): T {
  return JSON.parse(content) as T;
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionRequest = {
  model: string;
  temperature?: number;
  response_format?: { type: string };
  messages: ChatMessage[];
};

type ProviderConfig = {
  label: string;
  baseUrl: string;
  apiKeyEnv: string;
};

function extractTextFromArrayContent(content: unknown[]): string {
  const text = content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }

      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        (part as { type?: unknown }).type === "output_text" &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }

      return "";
    })
    .join("")
    .trim();

  return text;
}

function extractMessageText(response: unknown): string {
  const responseLike = response as {
    choices?: Array<{
      message?: { content?: unknown };
      text?: unknown;
    }>;
    output_text?: unknown;
    output?: Array<{
      content?: unknown[];
    }>;
    data?: Array<{
      text?: unknown;
    }>;
  };
  const choice = responseLike?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = extractTextFromArrayContent(content);
    if (text) {
      return text;
    }
  }

  if (typeof choice?.text === "string" && choice.text.trim()) {
    return choice.text.trim();
  }

  if (typeof responseLike?.output_text === "string" && responseLike.output_text.trim()) {
    return responseLike.output_text.trim();
  }

  const outputContent = responseLike?.output?.[0]?.content;
  if (Array.isArray(outputContent)) {
    const text = extractTextFromArrayContent(outputContent);
    if (text) {
      return text;
    }
  }

  if (typeof responseLike?.data?.[0]?.text === "string" && responseLike.data[0].text.trim()) {
    return responseLike.data[0].text.trim();
  }

  console.error("[ai.extractMessageText] unexpected provider response", response);
  throw new Error("模型返回格式不兼容：没有找到可读取的文本结果。请检查第三方接口是否兼容 OpenAI Chat Completions。");
}

async function buildProviderConfig() {
  const settings = await getSettings();
  const presetProvider = getProvider(settings.selectedProvider);
  const provider: ProviderConfig =
    settings.selectedProvider === "custom"
      ? {
          ...presetProvider,
          label: settings.customProviderLabel || "Custom",
          baseUrl: settings.customBaseUrl || "",
          apiKeyEnv: settings.customApiKeyEnv || "CUSTOM_AI_API_KEY"
        }
      : presetProvider;
  const apiKey = process.env[provider.apiKeyEnv];

  if (!apiKey) {
    throw new Error(
      `当前已选择 ${provider.label}，但环境变量 ${provider.apiKeyEnv} 未配置。请先去 Vercel 后台补上 API Key。`
    );
  }

  if (!provider.baseUrl) {
    throw new Error("当前提供商缺少 Base URL，请先去后台补上。");
  }

  return { apiKey, provider, settings };
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

async function parseSseResponse(responseText: string) {
  let aggregatedText = "";
  const usageChunks: unknown[] = [];

  for (const block of responseText.split("\n\n")) {
    const line = block
      .split("\n")
      .map((part) => part.trim())
      .find((part) => part.startsWith("data:"));

    if (!line) {
      continue;
    }

    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(payload) as {
        choices?: Array<{
          delta?: { content?: string; role?: string };
          message?: { content?: string };
        }>;
        usage?: unknown;
      };

      const deltaContent = parsed.choices?.[0]?.delta?.content;
      const messageContent = parsed.choices?.[0]?.message?.content;

      if (typeof deltaContent === "string") {
        aggregatedText += deltaContent;
      }

      if (typeof messageContent === "string") {
        aggregatedText += messageContent;
      }

      if (parsed.usage) {
        usageChunks.push(parsed.usage);
      }
    } catch (error) {
      console.error("[ai.parseSseResponse] failed to parse SSE chunk", { payload, error });
    }
  }

  if (!aggregatedText.trim()) {
    console.error("[ai.parseSseResponse] empty SSE content", {
      preview: responseText.slice(0, 1000),
      usageChunks
    });
    throw new Error("上游接口返回了流式响应，但没有实际文本内容。请检查中转站该模型的 OpenAI Chat 通道是否正常。");
  }

  return aggregatedText.trim();
}

async function createChatCompletion(
  provider: ProviderConfig,
  apiKey: string,
  payload: ChatCompletionRequest
) {
  const response = await fetch(`${normalizeBaseUrl(provider.baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({
      ...payload,
      stream: false
    }),
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!response.ok) {
    console.error("[ai.createChatCompletion] upstream request failed", {
      provider: provider.label,
      status: response.status,
      contentType,
      body: rawText.slice(0, 2000)
    });

    try {
      const parsed = JSON.parse(rawText) as { error?: { message?: string } };
      throw new Error(parsed.error?.message || `上游接口请求失败，状态码 ${response.status}。`);
    } catch {
      throw new Error(`上游接口请求失败，状态码 ${response.status}。`);
    }
  }

  if (contentType.includes("text/event-stream")) {
    return parseSseResponse(rawText);
  }

  try {
    return extractMessageText(JSON.parse(rawText));
  } catch (error) {
    console.error("[ai.createChatCompletion] failed to parse non-stream response", {
      provider: provider.label,
      contentType,
      body: rawText.slice(0, 2000),
      error
    });
    throw error;
  }
}

export async function translateText(input: {
  originalText: string;
  sourceLanguage?: string;
  targetLanguage: string;
  contextText?: string;
}) {
  const { apiKey, provider, settings } = await buildProviderConfig();
  const systemPrompt = settings.systemPrompt || getDefaultSettings().systemPrompt;

  const contextBlock = input.contextText?.trim()
    ? `\n\n【上下文】\n${input.contextText.trim()}`
    : "";

  const outputText = await createChatCompletion(provider, apiKey, {
    model: settings.translateModel,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `目标语言：${input.targetLanguage}\n源语言：${input.sourceLanguage || "auto"}${contextBlock}\n\n【待翻译文本】\n${input.originalText.trim()}`
      }
    ]
  });
  if (!outputText) {
    throw new Error("模型没有返回翻译结果。");
  }

  const now = new Date().toISOString();
  const record: TranslationRecord = {
    id: randomUUID(),
    originalText: input.originalText.trim(),
    sourceLanguage: input.sourceLanguage?.trim() || "auto",
    targetLanguage: input.targetLanguage.trim(),
    contextText: input.contextText?.trim() || null,
    outputText,
    reviewedText: null,
    status: "draft",
    createdAt: now,
    updatedAt: now
  };

  return record;
}

export async function polishText(input: { text: string; style: string }) {
  const { apiKey, provider, settings } = await buildProviderConfig();
  const content = await createChatCompletion(provider, apiKey, {
    model: settings.polishModel,
    response_format: { type: "json_object" },
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "你是一位日语编辑。请返回 JSON，包含 originalText、overallAssessment、identifiedIssues、polishedVersions。"
      },
      {
        role: "user",
        content: `润色风格：${input.style}\n\n原文：\n${input.text.trim()}`
      }
    ]
  });
  if (!content) {
    throw new Error("模型没有返回润色结果。");
  }

  return parseJson<PolishResult>(content);
}

export async function scoreTranslation(input: {
  originalText: string;
  candidateText: string;
  sourceLanguage: string;
  targetLanguage: string;
}) {
  const { apiKey, provider, settings } = await buildProviderConfig();
  const content = await createChatCompletion(provider, apiKey, {
    model: settings.scoringModel,
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "你是翻译质检员。只返回 JSON：overallScore、criteriaScores、strengths、weaknesses、overallComment。"
      },
      {
        role: "user",
        content: `源语言：${input.sourceLanguage}\n目标语言：${input.targetLanguage}\n\n原文：\n${input.originalText}\n\n译文：\n${input.candidateText}`
      }
    ]
  });
  if (!content) {
    throw new Error("模型没有返回评分结果。");
  }

  return parseJson<ScoreResult>(content);
}
