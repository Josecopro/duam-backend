import type { PageQuery } from "../domain/pagination.js";
import type { PqrsRequestRepository, RequestStatus, RequestType } from "../domain/pqrs-request.js";

export function makePqrsRequestUseCases(repo: PqrsRequestRepository) {
  return {
    /** `userId` lo pone el controlador desde el token; el body nunca lo decide. */
    create: (userId: number, input: { type: RequestType; message: string; universityId: number }) => repo.create({ ...input, userId }),
    listMine: (userId: number, query: PageQuery, status?: RequestStatus) => repo.list(query, { userId, status }, { withUser: false }),
    listAll: (query: PageQuery, status?: RequestStatus) => repo.list(query, { status }, { withUser: true }),
    updateStatus: (id: number, status: RequestStatus) => repo.updateStatus(id, status),
  };
}
