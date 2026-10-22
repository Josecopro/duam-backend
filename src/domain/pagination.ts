export interface PageQuery {
  page: number;
  limit: number;
}

/** Forma de toda respuesta paginada: `{ pagination, data }`. */
export interface Page<T> {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  data: T[];
}

export function toPage<T>(data: T[], total: number, { page, limit }: PageQuery): Page<T> {
  return { pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, data };
}
