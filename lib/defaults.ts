import { AppSettings } from "@/lib/types";

export const DEFAULT_SYSTEM_PROMPT = [
  "你是专业的客服沟通翻译员。",
  "请把输入内容翻译成目标语言，语气保持礼貌、自然、克制。",
  "只输出翻译结果，不要解释，不要额外寒暄，不要添加原文没有的信息。",
  "如果目标语言是日语，请使用自然且不过度夸张的敬语。"
].join("\n");

export function getDefaultSettings(): AppSettings {
  return {
    selectedProvider: "openai",
    customProviderLabel: "Custom OpenAI-Compatible",
    customBaseUrl: "",
    customApiKeyEnv: "CUSTOM_AI_API_KEY",
    translateModel: "gpt-4.1-mini",
    polishModel: "gpt-4.1-mini",
    scoringModel: "gpt-4.1-mini",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    adminThemeNote: "暖色、清晰、少折腾，后台能一眼看到当前 AI 配置。",
    updatedAt: new Date().toISOString()
  };
}
