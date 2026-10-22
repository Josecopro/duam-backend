import type { Page, PageQuery } from "./pagination.js";

export type RequestType = "peticion" | "queja" | "reclamo" | "sugerencia";
export type RequestStatus = "new" | "in_progress" | "closed";

/** Solicitud PQRS de un usuario sobre una universidad (la interacción usuario↔catálogo). */
export interface PqrsRequest {
  id: number;
  type: RequestType;
  message: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  university: { id: number; name: string };
  /** Solo se incluye en la vista de administración. */
  user?: { id: number; name: string; email: string };
}

export interface NewPqrsRequest {
  type: RequestType;
  message: string;
  universityId: number;
  /** Siempre el id del token, nunca del body. */
  userId: number;
}

export interface PqrsRequestFilters {
  status?: RequestStatus;
  userId?: number;
}

export interface PqrsRequestRepository {
  /** Lanza NotFoundError si la universidad no existe. */
  create(data: NewPqrsRequest): Promise<PqrsRequest>;
  list(query: PageQuery, filters: PqrsRequestFilters, options: { withUser: boolean }): Promise<Page<PqrsRequest>>;
  /** Lanza NotFoundError. */
  updateStatus(id: number, status: RequestStatus): Promise<PqrsRequest>;
}
