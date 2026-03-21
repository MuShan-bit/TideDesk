import { render, screen } from "@testing-library/react";
import AiPage from "./page";
import { apiRequest } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@/lib/request-locale", () => {
  const { getMessages } = jest.requireActual("@/lib/i18n");

  return {
    getRequestMessages: jest.fn(async () => ({
      locale: "zh-CN",
      messages: getMessages("zh-CN"),
    })),
  };
});

jest.mock("./ai-console", () => ({
  AiConsole: ({
    models,
    providers,
    loadError,
    taskRecords,
    usageLoadError,
    usageSummary,
  }: {
    loadError?: string | null;
    models: Array<{ displayName: string }>;
    providers: Array<{ name: string }>;
    taskRecords: Array<{ id: string }>;
    usageLoadError?: string | null;
    usageSummary: { totalCalls: number } | null;
  }) => (
    <div data-testid="ai-console">
      {`providers:${providers.length};models:${models.length};tasks:${taskRecords.length};usage:${usageSummary?.totalCalls ?? "none"};error:${loadError ?? "none"};usageError:${usageLoadError ?? "none"}`}
    </div>
  ),
}));

describe("AiPage", () => {
  it("loads provider and model data for the AI console", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockResolvedValueOnce([
        {
          id: "provider-001",
          providerType: "OPENAI",
          name: "OpenAI",
          baseUrl: null,
          enabled: true,
          hasApiKey: true,
          models: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "model-001",
          providerConfigId: "provider-001",
          modelCode: "gpt-5.2",
          displayName: "GPT-5.2 classifier",
          taskType: "POST_CLASSIFY",
          isDefault: true,
          enabled: true,
          parametersJson: {
            temperature: 0.2,
          },
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-21T00:00:00.000Z",
          provider: {
            id: "provider-001",
            providerType: "OPENAI",
            name: "OpenAI",
            baseUrl: null,
            enabled: true,
            hasApiKey: true,
          },
        },
      ])
      .mockResolvedValueOnce({
        rangeDays: 30,
        totalCalls: 4,
        successCalls: 3,
        failedCalls: 1,
        rateLimitedCalls: 0,
        totalInputTokens: 120,
        totalOutputTokens: 48,
        totalTokens: 168,
        totalEstimatedCostUsd: 0.0021,
        byTaskType: [],
        byProvider: [],
        limits: {
          windowSeconds: 60,
          maxRequestsPerWindow: 20,
          recentWindowCalls: 1,
          remainingWindowRequests: 19,
          dailyTokenLimit: 2000000,
          dailyTokenUsage: 168,
          remainingDailyTokens: 1999832,
        },
      })
      .mockResolvedValueOnce([
        {
          id: "task-001",
        },
      ]);

    render(await AiPage());

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, {
      path: "/ai/providers?includeDisabled=true",
      method: "GET",
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, {
      path: "/ai/models?includeDisabled=true",
      method: "GET",
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(3, {
      path: "/ai/usage/summary?days=30",
      method: "GET",
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(4, {
      path: "/ai/tasks?limit=12",
      method: "GET",
    });
    expect(
      screen.getByRole("heading", { name: "AI 模型" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ai-console")).toHaveTextContent(
      "providers:1;models:1;tasks:1;usage:4;error:none;usageError:none",
    );
  });

  it("surfaces the load error when AI requests fail", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockRejectedValueOnce(new Error("providers failed"))
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("usage failed"))
      .mockResolvedValueOnce([]);

    render(await AiPage());

    expect(screen.getByTestId("ai-console")).toHaveTextContent(
      "providers:0;models:0;tasks:0;usage:none;error:AI 提供商或模型数据加载失败，请稍后重试。;usageError:AI 调用审计或成本统计暂时不可用，其余配置页面仍可继续使用。",
    );
  });
});
