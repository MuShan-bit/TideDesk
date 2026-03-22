import { render, screen } from "@testing-library/react";
import BindingsPage from "./page";
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

jest.mock("./binding-console", () => ({
  BindingConsole: ({
    bindings,
  }: {
    bindings: Array<{ username: string; status: string }>;
  }) => (
    <div data-testid="binding-console">
      {bindings.length > 0 ? `${bindings[0].username}:${bindings[0].status}` : "unbound"}
    </div>
  ),
}));

jest.mock("./publish-channel-console", () => ({
  PublishChannelConsole: ({
    channels,
  }: {
    channels: Array<{ displayName: string; status: string }>;
  }) => (
    <div data-testid="publish-channel-console">
      {channels.length > 0
        ? `${channels[0].displayName}:${channels[0].status}`
        : "empty"}
    </div>
  ),
}));

describe("BindingsPage", () => {
  it("loads the binding list and forwards it to the console", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockResolvedValueOnce([
        {
          id: "binding-001",
          xUserId: "x-user-001",
          username: "browser_owner",
          displayName: "Browser Owner",
          avatarUrl: "https://images.example.com/browser-owner.png",
          status: "ACTIVE",
          credentialSource: "WEB_LOGIN",
          crawlEnabled: true,
          crawlIntervalMinutes: 60,
          lastValidatedAt: "2026-03-19T00:00:00.000Z",
          lastCrawledAt: null,
          nextCrawlAt: "2026-03-19T01:00:00.000Z",
          lastErrorMessage: null,
          updatedAt: "2026-03-19T00:00:00.000Z",
          crawlJob: {
            enabled: true,
            intervalMinutes: 60,
            lastRunAt: null,
            nextRunAt: "2026-03-19T01:00:00.000Z",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "channel-001",
          platformType: "WECHAT",
          displayName: "公众号主号",
          accountIdentifier: "wx-app-001",
          status: "ACTIVE",
          lastValidatedAt: "2026-03-19T00:10:00.000Z",
          lastValidationError: null,
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:10:00.000Z",
        },
      ]);

    render(await BindingsPage());

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: "/bindings",
      method: "GET",
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, {
      path: "/publishing/channels",
      method: "GET",
    });
    expect(screen.getByRole("heading", { name: "绑定" })).toBeInTheDocument();
    expect(screen.getByTestId("binding-console")).toHaveTextContent(
      "browser_owner:ACTIVE",
    );
    expect(screen.getByTestId("publish-channel-console")).toHaveTextContent(
      "公众号主号:ACTIVE",
    );
  });

  it("renders an unbound state when the binding list is empty", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    render(await BindingsPage());

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: "/bindings",
      method: "GET",
    });
    expect(screen.getByTestId("binding-console")).toHaveTextContent("unbound");
    expect(screen.getByTestId("publish-channel-console")).toHaveTextContent(
      "empty",
    );
  });
});
