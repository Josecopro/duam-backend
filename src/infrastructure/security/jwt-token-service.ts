import jwt, { type SignOptions } from "jsonwebtoken";
import type { AuthPayload, TokenService } from "../../application/ports.js";
import { UnauthorizedError } from "../../domain/errors.js";
import { env } from "../config/env.js";

const ALGORITHM = "HS256";

export const jwtTokenService: TokenService = {
  // Solo id y role: el payload de un JWT se puede leer sin la clave.
  sign: ({ id, role }) =>
    jwt.sign({ id, role }, env.jwtSecret, { algorithm: ALGORITHM, expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] }),

  verify(token) {
    try {
      const decoded = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
      if (typeof decoded === "object" && typeof decoded.id === "number" && (decoded.role === "admin" || decoded.role === "user")) {
        return { id: decoded.id, role: decoded.role } satisfies AuthPayload;
      }
    } catch {
      // firma inválida, token mal formado o expirado
    }
    throw new UnauthorizedError("Sesión inválida o expirada");
  },
};
