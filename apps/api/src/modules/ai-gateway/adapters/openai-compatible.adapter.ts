import { AIProviderType } from '@prisma/client';
import { BadGatewayException, Injectable } from '@nestjs/common';
import type {
  AiAdapterRequest,
  AiAdapterResult,
  AiProviderAdapter,
} from '../ai-gateway.types';

type OpenAiCompatibleResponse = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?:
        | string
        | Array<{
            text?: string;
            type?: string;
          }>
        | null;
    } | null;
  }>;
  error?: {
    message?: string;
  };
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
    total_tokens?: number;
  };
};

@Injectable()
export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  supports(providerType: AIProviderType) {
    return (
      providerType === AIProviderType.OPENAI ||
      providerType === AIProviderType.OPENAI_COMPATIBLE
    );
  }

  async generateText(request: AiAdapterRequest): Promise<AiAdapterResult> {
    const url = `${this.resolveBaseUrl(request.providerType, request.baseUrl)}/chat/completions`;
    const maxAttempts = Math.max(request.maxAttempts ?? 2, 1);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${request.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: request.modelCode,
            messages: request.messages,
            ...(request.responseFormat === 'json_object'
              ? {
                  response_format: {
                    type: 'json_object',
                  },
                }
              : {}),
            ...(request.parameters ?? {}),
          }),
          signal: AbortSignal.timeout(request.timeoutMs ?? 30_000),
        });

        if (!response.ok) {
          const errorPayload = await response.text();
          const errorMessage = this.extractErrorMessage(errorPayload);

          if (this.shouldRetry(response.status) && attempt < maxAttempts) {
            lastError = new BadGatewayException(errorMessage);
            continue;
          }

          throw new BadGatewayException(errorMessage);
        }

        const payload = (await response.json()) as OpenAiCompatibleResponse;
        const firstChoice = payload.choices?.[0];
        const text = this.extractContent(firstChoice?.message?.content);

        if (!text) {
          throw new BadGatewayException(
            'AI provider returned an empty completion payload',
          );
        }

        return {
          text,
          finishReason: firstChoice?.finish_reason ?? null,
          usage: {
            inputTokens: payload.usage?.prompt_tokens ?? null,
            outputTokens: payload.usage?.completion_tokens ?? null,
            totalTokens: payload.usage?.total_tokens ?? null,
          },
          rawResponseJson: payload,
        };
      } catch (error) {
        lastError = error;

        if (attempt >= maxAttempts || !this.isRetriableError(error)) {
          break;
        }
      }
    }

    if (lastError instanceof BadGatewayException) {
      throw lastError;
    }

    throw new BadGatewayException(
      lastError instanceof Error
        ? `AI provider request failed: ${lastError.message}`
        : 'AI provider request failed',
    );
  }

  private resolveBaseUrl(
    providerType: AIProviderType,
    configuredBaseUrl: string | null,
  ) {
    const rawBaseUrl =
      providerType === AIProviderType.OPENAI
        ? configuredBaseUrl ?? 'https://api.openai.com/v1'
        : configuredBaseUrl;

    if (!rawBaseUrl) {
      throw new BadGatewayException(
        `Missing baseUrl for provider type ${providerType}`,
      );
    }

    return rawBaseUrl.replace(/\/+$/, '');
  }

  private extractContent(
    content:
      | string
      | Array<{
          text?: string;
          type?: string;
        }>
      | null
      | undefined,
  ) {
    if (typeof content === 'string') {
      const trimmed = content.trim();

      return trimmed.length > 0 ? trimmed : '';
    }

    if (!Array.isArray(content)) {
      return '';
    }

    return content
      .map((item) => (typeof item.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }

  private extractErrorMessage(payload: string) {
    if (!payload) {
      return 'AI provider request failed';
    }

    try {
      const parsed = JSON.parse(payload) as OpenAiCompatibleResponse;

      if (typeof parsed.error?.message === 'string' && parsed.error.message) {
        return parsed.error.message;
      }
    } catch {
      return payload;
    }

    return payload;
  }

  private shouldRetry(status: number) {
    return status === 408 || status === 429 || status >= 500;
  }

  private isRetriableError(error: unknown) {
    return !(error instanceof BadGatewayException);
  }
}

