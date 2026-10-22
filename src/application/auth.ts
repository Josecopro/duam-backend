import { NotFoundError, UnauthorizedError } from "../domain/errors.js";
import { type PublicUser, type UserRepository, toPublicUser } from "../domain/user.js";
import type { PasswordHasher, TokenService } from "./ports.js";

export interface AuthResult {
  token: string;
  user: PublicUser;
}

// Mismo mensaje para email inexistente y contraseña incorrecta: no revela cuál falló.
const INVALID_CREDENTIALS = "Correo o contraseña incorrectos";

export function makeAuthUseCases(users: UserRepository, hasher: PasswordHasher, tokens: TokenService) {
  // Hash de relleno para comparar aunque el email no exista: el tiempo de respuesta no delata si la cuenta existe.
  const dummyHash = hasher.hash("contraseña-de-relleno");

  return {
    /** El rol siempre es "user": nadie puede registrarse como admin desde la API. */
    async register(input: { name: string; email: string; password: string }): Promise<AuthResult> {
      const user = await users.create({ ...input, password: await hasher.hash(input.password), role: "user" });
      return { token: tokens.sign({ id: user.id, role: user.role }), user: toPublicUser(user) };
    },

    async login(input: { email: string; password: string }): Promise<AuthResult> {
      const user = await users.findByEmail(input.email);
      const ok = await hasher.compare(input.password, user?.password ?? (await dummyHash));
      if (!user || !ok) throw new UnauthorizedError(INVALID_CREDENTIALS);
      return { token: tokens.sign({ id: user.id, role: user.role }), user: toPublicUser(user) };
    },

    async me(userId: number): Promise<PublicUser> {
      const user = await users.findById(userId);
      if (!user) throw new NotFoundError("Usuario no encontrado");
      return toPublicUser(user);
    },
  };
}
