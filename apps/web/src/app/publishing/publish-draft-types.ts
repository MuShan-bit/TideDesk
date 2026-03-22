export type PublishDraftSourceTypeValue = "ARCHIVE" | "REPORT" | "MIXED";
export type PublishDraftStatusValue =
  | "DRAFT"
  | "READY"
  | "PUBLISHED_PARTIAL"
  | "PUBLISHED_ALL"
  | "FAILED";
export type PublishJobStatusValue =
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";
export type PublishPlatformTypeValue = "WECHAT" | "ZHIHU" | "CSDN";
export type PublishBindingStatusValue =
  | "PENDING"
  | "ACTIVE"
  | "INVALID"
  | "DISABLED";

export type PublishDraftListItemRecord = {
  id: string;
  sourceType: PublishDraftSourceTypeValue;
  status: PublishDraftStatusValue;
  title: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  sourceSnapshot: {
    reportIds: string[];
    archivedPostIds: string[];
  };
  _count: {
    publishJobs: number;
  };
};

export type PublishDraftDetailRecord = {
  id: string;
  sourceType: PublishDraftSourceTypeValue;
  status: PublishDraftStatusValue;
  title: string;
  summary: string | null;
  richTextJson: unknown;
  renderedHtml: string | null;
  createdAt: string;
  updatedAt: string;
  sourceSnapshot: {
    reportIds: string[];
    archivedPostIds: string[];
  };
  sourceReport: null | {
    id: string;
    title: string;
    reportType: "DAILY" | "WEEKLY" | "MONTHLY";
    periodStart: string;
    periodEnd: string;
    sourcePostsCount: number;
    summary: string | null;
  };
  sourceArchives: Array<{
    id: string;
    xPostId: string;
    postUrl: string;
    rawText: string;
    sourceCreatedAt: string;
    authorUsername: string;
    authorDisplayName: string | null;
    summary: string | null;
    binding: {
      id: string;
      username: string;
      displayName: string | null;
    };
  }>;
  publishJobs: Array<{
    id: string;
    status: PublishJobStatusValue;
    remotePostId: string | null;
    remotePostUrl: string | null;
    errorMessage: string | null;
    publishedAt: string | null;
    channelBinding: {
      id: string;
      platformType: PublishPlatformTypeValue;
      displayName: string;
      accountIdentifier: string | null;
      status: PublishBindingStatusValue;
    };
  }>;
};
