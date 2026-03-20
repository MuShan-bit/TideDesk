import { render, screen } from "@testing-library/react";
import StrategiesPage from "./page";
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

jest.mock("./strategy-console", () => ({
  StrategyConsole: ({
    bindings,
  }: {
    bindings: Array<{ username: string; crawlProfiles: Array<unknown> }>;
  }) => (
    <div data-testid="strategy-console">
      {bindings.length > 0
        ? `${bindings[0].username}:${bindings[0].crawlProfiles.length}`
        : "no-bindings"}
    </div>
  ),
}));

describe("StrategiesPage", () => {
  it("loads bindings and forwards them to the strategy console", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValue([
      {
        id: "binding-001",
        xUserId: "x-user-001",
        username: "strategy_owner",
        displayName: "Strategy Owner",
        avatarUrl: "https://images.example.com/strategy-owner.png",
        status: "ACTIVE",
        credentialSource: "WEB_LOGIN",
        crawlEnabled: true,
        crawlIntervalMinutes: 60,
        lastValidatedAt: "2026-03-20T00:00:00.000Z",
        lastCrawledAt: null,
        nextCrawlAt: "2026-03-20T01:00:00.000Z",
        lastErrorMessage: null,
        updatedAt: "2026-03-20T00:00:00.000Z",
        crawlJob: {
          enabled: true,
          intervalMinutes: 60,
          lastRunAt: null,
          nextRunAt: "2026-03-20T01:00:00.000Z",
        },
        crawlProfiles: [
          {
            id: "profile-001",
            enabled: true,
            intervalMinutes: 60,
            language: null,
            lastRunAt: null,
            maxPosts: 20,
            mode: "RECOMMENDED",
            nextRunAt: "2026-03-20T01:00:00.000Z",
            queryText: null,
            region: null,
            scheduleCron: null,
            scheduleKind: "INTERVAL",
          },
        ],
      },
    ]);

    render(await StrategiesPage());

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: "/bindings",
      method: "GET",
    });
    expect(screen.getByRole("heading", { name: "策略" })).toBeInTheDocument();
    expect(screen.getByTestId("strategy-console")).toHaveTextContent(
      "strategy_owner:1",
    );
  });

  it("renders the empty binding state when there is no bound account", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValue([]);

    render(await StrategiesPage());

    expect(screen.getByTestId("strategy-console")).toHaveTextContent(
      "no-bindings",
    );
  });
});
