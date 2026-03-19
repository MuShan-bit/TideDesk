import { render, screen } from "@testing-library/react";
import ArchivesPage from "./page";
import { apiRequest } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiRequest: jest.fn(),
  getApiErrorMessage: jest.fn((error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
  ),
}));

describe("ArchivesPage", () => {
  it("loads filtered archives and renders cards with pagination", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValue({
      items: [
        {
          id: "archive-001",
          postType: "QUOTE",
          postUrl: "https://x.com/openai_news/status/post-001",
          authorUsername: "openai_news",
          authorDisplayName: "OpenAI Newsroom",
          rawText: "Quoted recommendation feed item with media summary.",
          sourceCreatedAt: "2026-03-18T10:00:00.000Z",
          archivedAt: "2026-03-19T08:30:00.000Z",
          mediaItems: [
            {
              id: "media-001",
              mediaType: "IMAGE",
              sourceUrl: "https://images.example.com/post-001.png",
            },
          ],
          binding: {
            id: "binding-001",
            username: "browser_owner",
          },
        },
      ],
      page: 2,
      pageSize: 6,
      total: 13,
    });

    render(
      await ArchivesPage({
        searchParams: Promise.resolve({
          keyword: "openai",
          postType: "QUOTE",
          dateFrom: "2026-03-01",
          dateTo: "2026-03-19",
          page: "2",
          pageSize: "6",
        }),
      }),
    );

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: "/archives?page=2&pageSize=6&keyword=openai&postType=QUOTE&dateFrom=2026-03-01&dateTo=2026-03-19",
      method: "GET",
    });
    expect(screen.getByRole("heading", { name: "Archives" })).toBeInTheDocument();
    expect(screen.getByText("筛选归档")).toBeInTheDocument();
    expect(screen.getByDisplayValue("openai")).toBeInTheDocument();
    expect(screen.getByText("关键词：openai")).toBeInTheDocument();
    expect(screen.getByText("类型：QUOTE")).toBeInTheDocument();
    expect(screen.getByText("@openai_news", { exact: false })).toBeInTheDocument();
    expect(
      screen.getByText(/来源绑定账号：@browser_owner/),
    ).toBeInTheDocument();
    expect(screen.getByText("第 2 / 3 页")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看详情" })).toHaveAttribute(
      "href",
      "/archives/archive-001",
    );
  });
});
