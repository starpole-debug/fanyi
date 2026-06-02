import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { getDefaultSettings } from "@/lib/defaults";
import { getProvider } from "@/lib/providers";
import { getSettings } from "@/lib/storage";
import { PolishResult, ScoreResult, TranslationRecord } from "@/lib/types";

function parseJson<T>(content: string): T {
  return JSON.parse(content) as T;
}

function extractMessageText(response: unknown): string {
  const choice = (response as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
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

        return "";
      })
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  console.error("[ai.extractMessageText] unexpected provider response", response);
  throw new Error("模型返回格式不兼容：没有找到可读取的文本结果。请检查第三方接口是否兼容 OpenAI Chat Completions。");
}

async function buildClient() {
  const settings = await getSettings();
  const presetProvider = getProvider(settings.selectedProvider);
  const provider =
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

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseUrl
  });

  return { client, provider, settings };
}

export async function translateText(input: {
  originalText: string;
  sourceLanguage?: string;
  targetLanguage: string;
  contextText?: string;
}) {
  const { client, settings } = await buildClient();
  const systemPrompt = settings.systemPrompt || getDefaultSettings().systemPrompt;

  const contextBlock = input.contextText?.trim()
    ? `\n\n【上下文】\n${input.contextText.trim()}`
    : "";

  const response = await client.chat.completions.create({
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

  const outputText = extractMessageText(response);
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
  const { client, settings } = await buildClient();
  const response = await client.chat.completions.create({
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

  const content = extractMessageText(response);
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
  const { client, settings } = await buildClient();
  const response = await client.chat.completions.create({
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

  const content = extractMessageText(response);
  if (!content) {
    throw new Error("模型没有返回评分结果。");
  }

  return parseJson<ScoreResult>(content);
}
