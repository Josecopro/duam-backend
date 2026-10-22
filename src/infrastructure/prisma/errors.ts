import { ConflictError, DomainError, NotFoundError } from "../../domain/errors.js";
import { Prisma } from "../../generated/prisma/client.js";

/**
 * Traduce los errores conocidos de Prisma a errores del dominio.
 * Devuelve undefined si no es un error de Prisma que sepamos manejar (el handler responde 500).
 * Referencia de códigos: https://www.prisma.io/docs/orm/reference/error-reference
 */
export function fromPrismaError(err: unknown, messages: { notFound?: string; conflict?: string } = {}): DomainError | undefined {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  switch (err.code) {
    case "P2002": // unique constraint
      return new ConflictError(messages.conflict ?? "Ya existe un registro con esos datos");
    case "P2003": // foreign key constraint
    case "P2014": // relation violation
      return new ConflictError(messages.conflict ?? "El registro está relacionado con otros datos");
    case "P2025": // record not found (update/delete)
      return new NotFoundError(messages.notFound);
    default:
      return undefined;
  }
}

/** Ejecuta una operación de Prisma y relanza sus errores conocidos como errores del dominio. */
export async function translate<T>(op: () => Promise<T>, messages: { notFound?: string; conflict?: string } = {}): Promise<T> {
  try {
    return await op();
  } catch (err) {
    throw fromPrismaError(err, messages) ?? err;
  }
}
