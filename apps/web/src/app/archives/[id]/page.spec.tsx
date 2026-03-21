import { render, screen, within } from "@testing-library/react";
import ArchiveDetailPage from "./page";
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

jest.mock("../actions", () => ({
  updateArchiveTaxonomyAction: jest.fn(async () => ({})),
}));

describe("ArchiveDetailPage", () => {
  it("renders dark-theme-ready archive detail surfaces", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockResolvedValueOnce({
        id: "archive-001",
        postType: "POST",
        postUrl: "https://x.com/openai/status/post-001",
        authorUsername: "openai",
        authorDisplayName: "OpenAI",
        authorAvatarUrl: null,
        rawText: "Archive body text.",
        renderedHtml: "<p>Archive body text.</p>",
        sourceCreatedAt: "2026-03-19T07:30:00.000Z",
        archivedAt: "2026-03-19T08:00:00.000Z",
        language: "en",
        replyCount: 3,
        repostCount: 5,
        quoteCount: 2,
        favoriteCount: 10,
        viewCount: "1200",
        primaryCategory: {
          id: "category-001",
          name: "AI",
          color: "#2563eb",
          isActive: true,
        },
        primaryCategorySource: "AI",
        primaryCategoryLocked: false,
        tagAssignmentsLocked: false,
        mediaItems: [
          {
            id: "media-001",
            mediaType: "IMAGE",
            sourceUrl: "https://images.example.com/media-001.png",
            previewUrl: null,
            width: 1280,
            height: 720,
            durationMs: null,
          },
        ],
        relations: [
          {
            id: "relation-001",
            relationType: "QUOTE",
            targetUrl: "https://x.com/openai/status/post-002",
            targetAuthorUsername: "sam",
            targetXPostId: "post-002",
          },
        ],
        binding: {
          id: "binding-001",
          username: "browser_owner",
          displayName: "Browser Owner",
        },
        tagAssignments: [
          {
            id: "tag-assignment-001",
            source: "AI",
            tag: {
              id: "tag-001",
              name: "OpenAI",
              color: "#10b981",
              isActive: true,
            },
          },
        ],
        firstCrawlRun: {
          id: "run-001",
          status: "SUCCESS",
          triggerType: "MANUAL",
        },
      })
      .mockResolvedValueOnce([
        {
          id: "category-001",
          name: "AI",
          color: "#2563eb",
          isActive: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "tag-001",
          name: "OpenAI",
          color: "#10b981",
          isActive: true,
        },
      ]);

    render(await ArchiveDetailPage({ params: Promise.resolve({ id: "archive-001" }) }));

    expect(screen.getByRole("link", { name: "返回列表" })).toHaveClass(
      "dark:bg-white/8",
    );
    expect(screen.getByRole("link", { name: "打开原帖" })).toHaveClass(
      "dark:bg-[#d8e2db]",
    );
    expect(screen.getByText("Archive body text.").closest("article")).toHaveClass(
      "dark:bg-[#161b17]",
    );
    expect(screen.getByRole("link", { name: "查看本次执行记录" })).toHaveClass(
      "dark:bg-white/10",
    );
    const mediaCard = screen.getByTestId("archive-media-card");

    expect(
      within(mediaCard).getByText("媒体预览已在正文中显示，这里保留资源入口。"),
    ).toBeInTheDocument();
    expect(within(mediaCard).queryByRole("img")).not.toBeInTheDocument();
    expect(mediaCard.querySelector("video")).toBeNull();
    expect(screen.getByText("分类与标签")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "保存人工分类与标签" }),
    ).toHaveClass("dark:bg-[#d8e2db]");
  });
});
