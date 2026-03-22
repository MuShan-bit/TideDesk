export type PublishPlatformTypeValue = "WECHAT" | "ZHIHU" | "CSDN";
export type PublishBindingStatusValue =
  | "PENDING"
  | "ACTIVE"
  | "INVALID"
  | "DISABLED";

export type PublishChannelBindingRecord = {
  id: string;
  platformType: PublishPlatformTypeValue;
  displayName: string;
  accountIdentifier: string | null;
  status: PublishBindingStatusValue;
  lastValidatedAt: string | null;
  lastValidationError: string | null;
  createdAt: string;
  updatedAt: string;
};
