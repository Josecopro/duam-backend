import type { RequestHandler } from "express";
import type { Role } from "../../../domain/user.js";
import { ForbiddenError, UnauthorizedError } from "../../../domain/errors.js";
import { container } from "../../../infrastructure/container.js";

/**
 * Autenticación centralizada: lee `Authorization: Bearer <token>`, lo verifica y deja el usuario en `req.user`.
 * Sin token o con token inválido/expirado → 401. Se aplica en los routers, no en cada controlador.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const [scheme, token] = (req.get("authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw new UnauthorizedError();
  req.user = container.tokens.verify(token);
  next();
};

/** Autorización por rol. Debe ir después de `authenticate`. Token válido sin el rol → 403. */
export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role !== role) throw new ForbiddenError();
    next();
  };

export const soloAdmin = requireRole("admin");
