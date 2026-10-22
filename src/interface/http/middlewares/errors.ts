import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError, NotFoundError } from "../../../domain/errors.js";
import { fromPrismaError } from "../../../infrastructure/prisma/errors.js";

export const notFound: RequestHandler = () => {
  throw new NotFoundError("Ruta no encontrada");
};

/** Primer mensaje por campo: `{ "email": "Ingresa un correo…" }`. */
function fieldErrors(err: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    details[key] ??= issue.message;
  }
  return details;
}

/**
 * Manejador único de errores. Respuesta siempre JSON `{ error, details? }`, nunca un stack trace.
 * Express 5 envía aquí también los errores de handlers async.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Datos inválidos", details: fieldErrors(err) });
    return;
  }
  const domain = err instanceof DomainError ? err : fromPrismaError(err);
  if (domain) {
    res.status(domain.status).json({ error: domain.message, ...(domain.details && { details: domain.details }) });
    return;
  }
  // Errores de body-parser (JSON mal formado, body demasiado grande) traen su propio status 4xx.
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    const message = err.type === "entity.too.large" ? "El cuerpo de la petición es demasiado grande" : "JSON mal formado";
    res.status(err.status).json({ error: message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
};
