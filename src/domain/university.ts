import type { Page, PageQuery } from "./pagination.js";

export type UniversityType = "private" | "public";

export interface University {
  id: number;
  name: string;
  url: string;
  type: UniversityType;
}

export type UniversityInput = Omit<University, "id">;

export interface UniversityFilters {
  type?: UniversityType;
  /** Búsqueda por nombre (sin distinguir mayúsculas). */
  q?: string;
}

export interface UniversityRepository {
  list(query: PageQuery, filters: UniversityFilters): Promise<Page<University>>;
  findById(id: number): Promise<University | null>;
  /** Lanza ConflictError si el nombre ya existe. */
  create(data: UniversityInput): Promise<University>;
  /** Lanza NotFoundError / ConflictError. */
  update(id: number, data: UniversityInput): Promise<University>;
  /** Lanza NotFoundError, o ConflictError si tiene solicitudes asociadas. */
  delete(id: number): Promise<void>;
}
