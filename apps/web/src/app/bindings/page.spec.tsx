import { render, screen } from "@testing-library/react";
import BindingsPage from "./page";
import { apiRequest } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("./binding-console", () => ({
  BindingConsole: ({
    currentBinding,
  }: {
    currentBinding: { username: string; status: string } | null;
  }) => (
    <div data-testid="binding-console">
      {currentBinding ? `${currentBinding.username}:${currentBinding.status}` : "unbound"}
    </div>
  ),
}));

describe("BindingsPage", () => {
  it("loads the current binding and forwards it to the console", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValue({
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
    });

    render(await BindingsPage());

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: "/bindings/current",
      method: "GET",
    });
    expect(screen.getByRole("heading", { name: "Bindings" })).toBeInTheDocument();
    expect(screen.getByTestId("binding-console")).toHaveTextContent(
      "browser_owner:ACTIVE",
    );
  });
});
