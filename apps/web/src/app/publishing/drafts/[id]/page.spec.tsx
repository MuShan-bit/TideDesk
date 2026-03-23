import { render, screen } from "@testing-library/react";
import PublishDraftDetailPage from "./page";
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

jest.mock("../../publish-draft-editor", () => ({
  PublishDraftEditor: ({
    draft,
  }: {
    draft: {
      id: string;
    };
  }) => <div data-testid="publish-draft-editor">{draft.id}</div>,
}));

jest.mock("../../publish-draft-job-console", () => ({
  PublishDraftJobConsole: ({
    draft,
  }: {
    draft: {
      id: string;
    };
  }) => <div data-testid="publish-draft-job-console">{draft.id}</div>,
}));

describe("PublishDraftDetailPage", () => {
  it("renders publish draft detail content and source sections", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockResolvedValueOnce({
        id: "draft-001",
        sourceType: "REPORT",
        status: "DRAFT",
        title: "AI 周报发布稿",
        summary: "本周重点集中在多平台发布链路与内容归档。",
        richTextJson: {
          version: 1,
          blocks: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "发布稿正文。" }],
            },
          ],
        },
        renderedHtml: "<p>发布稿正文。</p>",
        createdAt: "2026-03-22T01:00:00.000Z",
        updatedAt: "2026-03-22T01:30:00.000Z",
        sourceSnapshot: {
          reportIds: ["report-001"],
          archivedPostIds: ["archive-001"],
        },
        sourceReport: {
          id: "report-001",
          title: "AI 周报",
          reportType: "WEEKLY",
          periodStart: "2026-03-01T00:00:00.000Z",
          periodEnd: "2026-03-08T00:00:00.000Z",
          sourcePostsCount: 1,
          summary: "报告摘要",
        },
        sourceArchives: [
          {
            id: "archive-001",
            xPostId: "post-001",
            postUrl: "https://x.com/demo/status/001",
            rawText: "第一条来源帖子",
            sourceCreatedAt: "2026-03-06T10:00:00.000Z",
            authorUsername: "demo_author",
            authorDisplayName: "Demo Author",
            summary: null,
            binding: {
              id: "binding-001",
              username: "demo_binding",
              displayName: "Demo Binding",
            },
          },
        ],
        publishJobs: [],
        tagAssignments: [],
        targetChannels: [],
      })
      .mockResolvedValueOnce([
        {
          id: "tag-001",
          name: "OpenAI",
          slug: "openai",
          color: "#10b981",
          isActive: true,
          isSystem: false,
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-21T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "channel-001",
          platformType: "WECHAT",
          displayName: "微信公众号主号",
          accountIdentifier: "gh_demo",
          status: "ACTIVE",
          lastValidatedAt: "2026-03-22T00:00:00.000Z",
          lastValidationError: null,
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-22T00:00:00.000Z",
        },
      ]);

    const { container } = render(
      await PublishDraftDetailPage({
        params: Promise.resolve({ id: "draft-001" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "AI 周报发布稿" }),
    ).toBeInTheDocument();
    const article = container.querySelector("article");

    expect(article).not.toBeNull();
    expect(article).toHaveTextContent("发布稿正文。");
    expect(screen.getByText("草稿来源")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "查看来源报告" })[0],
    ).toHaveAttribute("href", "/reports/report-001");
    expect(screen.getByRole("link", { name: "查看来源归档" })).toHaveAttribute(
      "href",
      "/archives/archive-001",
    );
    expect(screen.getByTestId("publish-draft-editor")).toHaveTextContent(
      "draft-001",
    );
    expect(screen.getByTestId("publish-draft-job-console")).toHaveTextContent(
      "draft-001",
    );
  });
});
