import { render, screen } from "@testing-library/react";
import ReportDetailPage from "./page";
import { apiRequest } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiRequest: jest.fn(),
  getApiErrorMessage: jest.fn((error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
  ),
  ApiRequestError: class ApiRequestError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
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

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("../report-editor", () => ({
  ReportEditor: ({ bodyText }: { bodyText: string }) => (
    <div data-testid="report-editor">{bodyText}</div>
  ),
}));

jest.mock("../report-publish-draft-card", () => ({
  ReportPublishDraftCard: ({ reportId }: { reportId: string }) => (
    <div data-testid="report-publish-card">{reportId}</div>
  ),
}));

describe("ReportDetailPage", () => {
  it("renders report detail sections and publish draft entry", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValue({
      id: "report-001",
      reportType: "WEEKLY",
      status: "READY",
      title: "AI 周报",
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-03-08T00:00:00.000Z",
      createdAt: "2026-03-08T01:00:00.000Z",
      updatedAt: "2026-03-08T01:30:00.000Z",
      richTextJson: {
        version: 1,
        blocks: [
          {
            type: "paragraph",
            children: [{ type: "text", text: "报告正文。" }],
          },
        ],
      },
      renderedHtml: "<p>报告正文。</p>",
      summaryJson: {
        summary: "本周重点集中在 agent 工作流与部署效率。",
      },
      sourcePosts: [
        {
          id: "source-001",
          archivedPostId: "archive-001",
          weightScore: null,
          archivedPost: {
            id: "archive-001",
            xPostId: "post-001",
            postUrl: "https://x.com/demo/status/001",
            rawText: "第一条来源帖子",
            sourceCreatedAt: "2026-03-06T10:00:00.000Z",
            authorUsername: "demo_author",
            authorDisplayName: "Demo Author",
            binding: {
              id: "binding-001",
              username: "demo_binding",
              displayName: "Demo Binding",
            },
            primaryCategory: null,
            tagAssignments: [],
          },
        },
      ],
    });

    const { container } = render(
      await ReportDetailPage({
        params: Promise.resolve({ id: "report-001" }),
      }),
    );

    expect(screen.getByRole("link", { name: "返回列表" })).toHaveClass(
      "dark:bg-white/8",
    );
    const article = container.querySelector("article");

    expect(article).not.toBeNull();
    expect(article).toHaveTextContent("报告正文。");
    expect(article).toHaveClass("dark:bg-[#161b17]");
    expect(screen.getByTestId("report-editor")).toHaveTextContent("报告正文。");
    expect(screen.getByText("来源帖子")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看来源帖子" })).toHaveAttribute(
      "href",
      "https://x.com/demo/status/001",
    );
    expect(screen.getByRole("link", { name: "导出 Markdown" })).toHaveAttribute(
      "href",
      "/api/reports/report-001/export?format=md",
    );
    expect(screen.getByTestId("report-publish-card")).toHaveTextContent(
      "report-001",
    );
  });
});
