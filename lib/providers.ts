import { ProviderDefinition, ProviderKey } from "@/lib/types";

export const PROVIDERS: ProviderDefinition[] = [
  {
    key: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    defaultModel: "gpt-4.1-mini",
    modelPlaceholder: "例如 gpt-4.1-mini"
  },
  {
    key: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    defaultModel: "openai/gpt-4.1-mini",
    modelPlaceholder: "例如 openai/gpt-4.1-mini"
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat",
    modelPlaceholder: "例如 deepseek-chat"
  },
  {
    key: "custom",
    label: "Custom",
    baseUrl: "",
    apiKeyEnv: "CUSTOM_AI_API_KEY",
    defaultModel: "gpt-4.1-mini",
    modelPlaceholder: "例如 gpt-4.1-mini / claude-sonnet-4 / gemini-2.5-pro"
  }
];

export function getProvider(key: ProviderKey): ProviderDefinition {
  const found = PROVIDERS.find((provider) => provider.key === key);
  if (!found) {
    throw new Error(`Unsupported provider: ${key}`);
  }
  return found;
}

export function getConfiguredProviders(): ProviderDefinition[] {
  return PROVIDERS.filter((provider) => Boolean(process.env[provider.apiKeyEnv]));
}
