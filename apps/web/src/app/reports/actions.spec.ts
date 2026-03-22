import { generateReportAction } from "./actions";
import { apiRequest } from "@/lib/api-client";

const redirectMock = jest.fn();
const revalidatePathMock = jest.fn();
const normalizeDateRangeForApiMock = jest.fn();

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

jest.mock("./report-utils", () => ({
  normalizeDateRangeForApi: (...args: unknown[]) =>
    normalizeDateRangeForApiMock(...args),
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

describe("report actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    normalizeDateRangeForApiMock.mockReturnValue({
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-03-08T00:00:00.000Z",
    });
  });

  it("rethrows redirect after generating a report", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    const formData = new FormData();

    formData.set("reportType", "WEEKLY");
    formData.set("periodStartDate", "2026-03-01");
    formData.set("periodEndDate", "2026-03-08");

    jest.mocked(apiRequest).mockResolvedValueOnce({
      id: "report-001",
    });
    redirectMock.mockImplementation(() => {
      throw redirectError;
    });

    await expect(generateReportAction({}, formData)).rejects.toBe(redirectError);

    expect(revalidatePathMock).toHaveBeenNthCalledWith(1, "/reports");
    expect(revalidatePathMock).toHaveBeenNthCalledWith(2, "/reports/report-001");
    expect(redirectMock).toHaveBeenCalledWith("/reports/report-001");
  });
});
