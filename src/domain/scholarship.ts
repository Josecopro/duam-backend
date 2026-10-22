import type { Page, PageQuery } from "./pagination.js";

export type ScholarshipType = "government" | "academic" | "sports";

export interface Scholarship {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  type: ScholarshipType;
  institution: string;
}

export interface ScholarshipRepository {
  list(query: PageQuery): Promise<Page<Scholarship>>;
}
