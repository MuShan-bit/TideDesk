import {
  createPublishDraftFromArchiveAction,
  createPublishDraftFromReportAction,
} from "./actions";
import { apiRequest } from "@/lib/api-client";

const redirectMock = jest.fn();
const revalidatePathMock = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

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

describe("publishing actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rethrows redirect after creating a report draft", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    const formData = new FormData();

    formData.set("reportId", "report-001");

    jest.mocked(apiRequest).mockResolvedValueOnce({
      id: "draft-001",
    });
    redirectMock.mockImplementation(() => {
      throw redirectError;
    });

    await expect(
      createPublishDraftFromReportAction({}, formData),
    ).rejects.toBe(redirectError);

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/reports");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/reports/report-001");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(
      3,
      "/publishing/drafts/draft-001",
    );
    expect(redirectMock).toHaveBeenCalledWith("/publishing/drafts/draft-001");
  });

  it("rethrows redirect after creating an archive draft", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    const formData = new FormData();

    formData.set("archiveId", "archive-001");

    jest.mocked(apiRequest).mockResolvedValueOnce({
      id: "draft-002",
    });
    redirectMock.mockImplementation(() => {
      throw redirectError;
    });

    await expect(
      createPublishDraftFromArchiveAction({}, formData),
    ).rejects.toBe(redirectError);

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/archives");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(
      2,
      "/archives/archive-001",
    );
    expect(revalidatePathMock).toHaveBeenNthCalledWith(
      3,
      "/publishing/drafts/draft-002",
    );
    expect(redirectMock).toHaveBeenCalledWith("/publishing/drafts/draft-002");
  });
});
