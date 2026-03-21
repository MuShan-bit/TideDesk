import { AIProviderType, AITaskType } from '@prisma/client';

export const AI_PROVIDER_ADAPTERS = Symbol('AI_PROVIDER_ADAPTERS');

export type AiGatewayMessage = {
  content: string;
  role: 'assistant' | 'system' | 'user';
};

export type AiGatewayRequest = {
  maxAttempts?: number;
  messages: AiGatewayMessage[];
  modelConfigId?: string;
  parameters?: Record<string, unknown>;
  responseFormat?: 'json_object' | 'text';
  taskType: AITaskType;
  timeoutMs?: number;
};

export type AiGatewayUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type AiGatewayResult = {
  displayName: string;
  finishReason: string | null;
  modelCode: string;
  modelConfigId: string;
  providerConfigId: string;
  providerType: AIProviderType;
  rawResponseJson: unknown;
  text: string;
  usage: AiGatewayUsage;
};

export type AiAdapterRequest = {
  apiKey: string;
  baseUrl: string | null;
  maxAttempts?: number;
  messages: AiGatewayMessage[];
  modelCode: string;
  parameters?: Record<string, unknown>;
  providerType: AIProviderType;
  responseFormat?: 'json_object' | 'text';
  timeoutMs?: number;
};

export type AiAdapterResult = {
  finishReason: string | null;
  rawResponseJson: unknown;
  text: string;
  usage: AiGatewayUsage;
};

export interface AiProviderAdapter {
  generateText(request: AiAdapterRequest): Promise<AiAdapterResult>;
  supports(providerType: AIProviderType): boolean;
}

