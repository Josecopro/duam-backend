// Lee y valida las variables de entorno una sola vez. Si falta algo crítico, la app no arranca.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name} (ver backend/.env.example)`);
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) throw new Error("JWT_SECRET debe tener al menos 32 caracteres");

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  /** Formato de jsonwebtoken: "2h", "7d", "3600"… */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "2h",
  /** Orígenes permitidos por CORS (URL del frontend), separados por coma. Nunca "*". */
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o && o !== "*"),
  port: Number(process.env.PORT ?? 4000),
};
