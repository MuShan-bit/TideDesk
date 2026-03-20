export type CategoryRecord = {
  color: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  isActive: boolean;
  isSystem: boolean;
  name: string;
  slug: string;
  sortOrder: number;
  updatedAt: string;
};

export type TagRecord = {
  color: string | null;
  createdAt: string;
  id: string;
  isActive: boolean;
  isSystem: boolean;
  name: string;
  slug: string;
  updatedAt: string;
};
