import pg from "pg";

// Un pool por instancia de la función. Con Neon, usar la cadena "pooled" (host con -pooler) en producción.
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL (ver backend/.env.example)");

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
