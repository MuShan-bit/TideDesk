import { render, screen } from "@testing-library/react";
import ReportsPage from "./page";
import { apiRequest } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiRequest: jest.fn(),
  getApiErrorMessage: jest.fn((error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
  ),
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

jest.mock("./report-generate-card", () => ({
  ReportGenerateCard: ({
    bindings,
    categories,
    tags,
  }: {
    bindings: Array<unknown>;
    categories: Array<unknown>;
    tags: Array<unknown>;
  }) => (
    <div data-testid="report-generate-card">
      {bindings.length}:{categories.length}:{tags.length}
    </div>
  ),
}));

describe("ReportsPage", () => {
  it("loads reports and renders list cards with filters", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "report-001",
            reportType: "WEEKLY",
            status: "READY",
            title: "AI 周报",
            periodStart: "2026-03-01T00:00:00.000Z",
            periodEnd: "2026-03-08T00:00:00.000Z",
            createdAt: "2026-03-08T01:00:00.000Z",
            updatedAt: "2026-03-08T01:30:00.000Z",
            summaryJson: {
              summary: "本周重点集中在 agent 工作流与部署效率。",
            },
            _count: {
              sourcePosts: 6,
            },
          },
        ],
        page: 1,
        pageSize: 8,
        total: 1,
      })
      .mockResolvedValueOnce([
        {
          id: "binding-001",
          username: "demo_binding",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "category-001",
          name: "AI",
          isActive: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "tag-001",
          name: "OpenAI",
          isActive: true,
        },
      ]);

    render(
      await ReportsPage({
        searchParams: Promise.resolve({
          reportType: "WEEKLY",
          status: "READY",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "报告中心" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("report-generate-card")).toHaveTextContent(
      "1:1:1",
    );
    expect(
      screen.getByRole("combobox", { name: "报告周期" }),
    ).toHaveValue("WEEKLY");
    expect(screen.getByText("AI 周报")).toBeInTheDocument();
    expect(screen.getByText("本周重点集中在 agent 工作流与部署效率。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看详情" })).toHaveAttribute(
      "href",
      "/reports/report-001",
    );
  });
});
