export type ReportTypeValue = "WEEKLY" | "MONTHLY";
export type ReportStatusValue = "DRAFT" | "READY" | "FAILED";
export type CrawlModeValue = "RECOMMENDED" | "HOT" | "SEARCH";

export type ReportListItem = {
  id: string;
  reportType: ReportTypeValue;
  status: ReportStatusValue;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
  summaryJson: unknown;
  _count: {
    sourcePosts: number;
  };
};

export type ReportsListResponse = {
  items: ReportListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ReportSourcePostRecord = {
  id: string;
  archivedPostId: string;
  weightScore: string | null;
  archivedPost: {
    id: string;
    xPostId: string;
    postUrl: string;
    rawText: string;
    sourceCreatedAt: string;
    authorUsername: string;
    authorDisplayName: string | null;
    binding: {
      id: string;
      username: string;
      displayName: string | null;
    };
    primaryCategory: null | {
      id: string;
      name: string;
      slug: string;
      color: string | null;
    };
    tagAssignments: Array<{
      id: string;
      tag: {
        id: string;
        name: string;
        slug: string;
        color: string | null;
      };
    }>;
  };
};

export type ReportDetailRecord = {
  id: string;
  reportType: ReportTypeValue;
  status: ReportStatusValue;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
  richTextJson: unknown;
  renderedHtml: string | null;
  summaryJson: unknown;
  sourcePosts: ReportSourcePostRecord[];
};
