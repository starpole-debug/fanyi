export type TranslationStatus = "draft" | "approved";

export type TranslationRecord = {
  id: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  contextText: string | null;
  outputText: string;
  reviewedText: string | null;
  status: TranslationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProviderKey = "openai" | "openrouter" | "deepseek" | "custom";

export type ProviderDefinition = {
  key: ProviderKey;
  label: string;
  baseUrl: string;
  apiKeyEnv: string;
  defaultModel: string;
  modelPlaceholder: string;
};

export type AppSettings = {
  selectedProvider: ProviderKey;
  customProviderLabel: string;
  customBaseUrl: string;
  customApiKeyEnv: string;
  translateModel: string;
  polishModel: string;
  scoringModel: string;
  systemPrompt: string;
  adminThemeNote: string;
  updatedAt: string;
};

export type ScoreResult = {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  overallComment: string;
  criteriaScores: Record<string, number>;
};

export type PolishResult = {
  originalText: string;
  overallAssessment: string;
  identifiedIssues: Array<{
    category: string;
    originalFragment: string;
    explanation: string;
    suggestion: string;
  }>;
  polishedVersions: Array<{
    styleApplied: string;
    rewrittenText: string;
    changeRationale: string;
  }>;
};
