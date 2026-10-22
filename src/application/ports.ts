import type { Role } from "../domain/user.js";

/** Lo único que viaja en el JWT: id y rol. El payload se puede leer sin la clave, así que nada sensible. */
export interface AuthPayload {
  id: number;
  role: Role;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface TokenService {
  sign(payload: AuthPayload): string;
  /** Lanza UnauthorizedError si el token es inválido o expiró. */
  verify(token: string): AuthPayload;
}
