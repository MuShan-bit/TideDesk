export type AiProviderType =
  | "OPENAI"
  | "ANTHROPIC"
  | "GEMINI"
  | "OPENAI_COMPATIBLE";

export type AiTaskType = "POST_CLASSIFY" | "REPORT_SUMMARY" | "DRAFT_REWRITE";
export type AiTaskStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

export type AiProviderRecord = {
  id: string;
  providerType: AiProviderType;
  name: string;
  baseUrl: string | null;
  enabled: boolean;
  hasApiKey: boolean;
  models: Array<{
    id: string;
    providerConfigId: string;
    modelCode: string;
    displayName: string;
    taskType: AiTaskType;
    isDefault: boolean;
    enabled: boolean;
    parametersJson: Record<string, unknown> | null;
    inputTokenPriceUsd: number | null;
    outputTokenPriceUsd: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type AiModelRecord = {
  id: string;
  providerConfigId: string;
  modelCode: string;
  displayName: string;
  taskType: AiTaskType;
  isDefault: boolean;
  enabled: boolean;
  parametersJson: Record<string, unknown> | null;
  inputTokenPriceUsd: number | null;
  outputTokenPriceUsd: number | null;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    providerType: AiProviderType;
    name: string;
    baseUrl: string | null;
    enabled: boolean;
    hasApiKey: boolean;
  };
};

export type AiUsageSummaryRecord = {
  rangeDays: number;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  rateLimitedCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  byTaskType: Array<{
    taskType: AiTaskType;
    calls: number;
    successCalls: number;
    failedCalls: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
  byProvider: Array<{
    providerConfigId: string;
    providerName: string;
    providerType: AiProviderType;
    calls: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
  limits: {
    windowSeconds: number;
    maxRequestsPerWindow: number;
    recentWindowCalls: number;
    remainingWindowRequests: number;
    dailyTokenLimit: number;
    dailyTokenUsage: number;
    remainingDailyTokens: number;
  };
};

export type AiTaskAuditRecord = {
  id: string;
  taskType: AiTaskType;
  targetType: string;
  targetId: string;
  status: AiTaskStatus;
  errorMessage: string | null;
  rateLimitScope: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    name: string;
    providerType: AiProviderType;
  } | null;
  model: {
    id: string;
    modelCode: string;
    displayName: string;
  } | null;
};
