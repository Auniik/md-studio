export type DocMeta = {
  title: string;
  slug: string;
  excerpt: string;
  isPublic: boolean;
  publicId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocFull = DocMeta & {
  bodyMd: string;
};

export type SortBy = "title-asc" | "date-newest" | "date-oldest" | "updated-newest";
export type FilterBy = "all" | "public" | "private";
