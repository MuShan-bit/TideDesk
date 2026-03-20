import { render, screen } from "@testing-library/react";
import TaxonomyPage from "./page";
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

jest.mock("./taxonomy-console", () => ({
  TaxonomyConsole: ({
    categories,
    loadError,
    tags,
  }: {
    categories: Array<{ name: string }>;
    loadError?: string | null;
    tags: Array<{ name: string }>;
  }) => (
    <div data-testid="taxonomy-console">
      {`categories:${categories.length};tags:${tags.length};error:${loadError ?? "none"}`}
    </div>
  ),
}));

describe("TaxonomyPage", () => {
  it("loads categories and tags for the management console", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockResolvedValueOnce([
        {
          id: "category-001",
          name: "AI",
          slug: "ai",
          description: "AI posts",
          color: "#2563eb",
          isActive: true,
          isSystem: false,
          sortOrder: 0,
          createdAt: "2026-03-20T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "tag-001",
          name: "OpenAI",
          slug: "openai",
          color: "#10b981",
          isActive: true,
          isSystem: false,
          createdAt: "2026-03-20T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z",
        },
      ]);

    render(await TaxonomyPage());

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, {
      path: "/taxonomy/categories?includeInactive=true",
      method: "GET",
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, {
      path: "/taxonomy/tags?includeInactive=true",
      method: "GET",
    });
    expect(screen.getByRole("heading", { name: "分类标签" })).toBeInTheDocument();
    expect(screen.getByTestId("taxonomy-console")).toHaveTextContent(
      "categories:1;tags:1;error:none",
    );
  });

  it("surfaces the load error when taxonomy requests fail", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockRejectedValueOnce(new Error("categories failed"))
      .mockResolvedValueOnce([]);

    render(await TaxonomyPage());

    expect(screen.getByTestId("taxonomy-console")).toHaveTextContent(
      "categories:0;tags:0;error:分类标签数据加载失败，请稍后重试。",
    );
  });
});
