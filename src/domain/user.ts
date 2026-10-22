export type Role = "admin" | "user";

/** Usuario tal como se guarda (incluye el hash). Nunca sale de la API. */
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: Role;
  createdAt: Date;
}

/** Lo que sí puede devolverse al cliente. */
export type PublicUser = Omit<User, "password">;

export const toPublicUser = ({ password: _password, ...user }: User): PublicUser => user;

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  /** Lanza ConflictError si el email ya existe. */
  create(data: { name: string; email: string; password: string; role: Role }): Promise<User>;
}
