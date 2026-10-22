import type { Page, PageQuery } from "./pagination.js";

export type Tone = "primary" | "secondary" | "success" | "accent";

/** Área de estudio con sus programas (subdivisiones). */
export interface Career {
  /** Slug usado en la URL del frontend (/carreras/<id>). */
  id: string;
  name: string;
  icon: string;
  image: string;
  description: string;
  summary: string;
  tone: Tone;
  symbol: string;
  programs: string[];
  sort: number;
}

export type CareerInput = Omit<Career, "id">;

export interface CareerRepository {
  list(query: PageQuery): Promise<Page<Career>>;
  findById(id: string): Promise<Career | null>;
  /** Lanza ConflictError si el id ya existe. */
  create(data: Career): Promise<Career>;
  /** Lanza NotFoundError. */
  update(id: string, data: CareerInput): Promise<Career>;
  /** Lanza NotFoundError. */
  delete(id: string): Promise<void>;
}
