import { AIProviderType } from '@prisma/client';
import { BadGatewayException } from '@nestjs/common';
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter';

describe('OpenAiCompatibleAdapter', () => {
  const originalFetch = global.fetch;
  let adapter: OpenAiCompatibleAdapter;

  beforeEach(() => {
    adapter = new OpenAiCompatibleAdapter();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends a chat completion request and parses text responses', async () => {
    const fetchMock = jest.mocked(global.fetch);

    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({
        'content-type': 'application/json',
      }),
      text: async () =>
        JSON.stringify({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: 'hello world',
              },
            },
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 9,
            total_tokens: 21,
          },
        }),
    } as Response);

    const result = await adapter.generateText({
      providerType: AIProviderType.OPENAI_COMPATIBLE,
      baseUrl: 'https://openrouter.ai/api/v1/',
      apiKey: 'sk-test',
      modelCode: 'openrouter/auto',
      messages: [
        {
          role: 'system',
          content: 'You are helpful.',
        },
        {
          role: 'user',
          content: 'Say hello',
        },
      ],
      responseFormat: 'json_object',
      parameters: {
        temperature: 0.2,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer sk-test',
          'content-type': 'application/json',
        }),
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [
            {
              role: 'system',
              content: 'You are helpful.',
            },
            {
              role: 'user',
              content: 'Say hello',
            },
          ],
          response_format: {
            type: 'json_object',
          },
          temperature: 0.2,
        }),
      }),
    );
    expect(result).toEqual({
      text: 'hello world',
      finishReason: 'stop',
      usage: {
        inputTokens: 12,
        outputTokens: 9,
        totalTokens: 21,
      },
      rawResponseJson: {
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: 'hello world',
            },
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 9,
          total_tokens: 21,
        },
      },
    });
  });

  it('retries once for retriable upstream errors', async () => {
    const fetchMock = jest.mocked(global.fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'upstream unavailable',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'application/json',
        }),
        text: async () =>
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  content: [{ type: 'output_text', text: 'retry success' }],
                },
              },
            ],
          }),
      } as Response);

    await expect(
      adapter.generateText({
        providerType: AIProviderType.OPENAI,
        baseUrl: null,
        apiKey: 'sk-openai',
        modelCode: 'gpt-5.2',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
        maxAttempts: 2,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        text: 'retry success',
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: {
            message: 'bad request',
          },
        }),
    } as Response);

    await expect(
      adapter.generateText({
        providerType: AIProviderType.OPENAI,
        baseUrl: null,
        apiKey: 'sk-openai',
        modelCode: 'gpt-5.2',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('surfaces a clearer error when the provider returns html instead of json', async () => {
    const fetchMock = jest.mocked(global.fetch);

    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8',
      }),
      text: async () => '<!doctype html><html><body>OpenRouter</body></html>',
    } as Response);

    await expect(
      adapter.generateText({
        providerType: AIProviderType.OPENAI_COMPATIBLE,
        baseUrl: 'https://openrouter.ai',
        apiKey: 'sk-test',
        modelCode: 'openrouter/auto',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
      }),
    ).rejects.toThrow(
      'AI provider returned HTML instead of JSON. Check whether the provider baseUrl points to the API root.',
    );
  });
});
