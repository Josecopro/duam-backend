// Seed: catálogo con los datos reales de la Entrega 1 (legacy/data/*.js) + usuarios de prueba.
// Idempotente (upsert): se puede correr varias veces. Uso: npm run db:seed
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL }) });
const load = (file: string) => JSON.parse(readFileSync(new URL(`./seed-data/${file}`, import.meta.url), "utf8"));

const universities = load("universities.json") as Record<"private" | "public", { name: string; url: string }[]>;
const { categories } = load("careers.json") as {
  categories: { id: string; name: string; icon: string; image: string; description: string; summary: string; tone: "primary" | "secondary" | "success" | "accent"; symbol: string; subcategories: string[] }[];
};
const { scholarships } = load("scholarships.json") as {
  scholarships: { id: string; title: string; description: string; videoUrl: string; type: "government" | "academic" | "sports"; institution: string }[];
};

// Credenciales de prueba SOLO para el ambiente de la entrega (documentadas en el README).
// En producción real se cambiarían con SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD.
const testUsers = [
  { name: "Administrador DUAM", email: "admin@duam.co", password: process.env.SEED_ADMIN_PASSWORD ?? "AdminDuam2026!", role: "admin" as const },
  { name: "Usuario de Prueba", email: "usuario@duam.co", password: process.env.SEED_USER_PASSWORD ?? "UsuarioDuam2026!", role: "user" as const },
];

async function main() {
  for (const type of ["private", "public"] as const) {
    for (const u of universities[type]) {
      await prisma.university.upsert({ where: { name: u.name }, create: { ...u, type }, update: { url: u.url, type } });
    }
  }

  for (const [sort, { subcategories, ...c }] of categories.entries()) {
    const data = { ...c, programs: subcategories, sort };
    await prisma.career.upsert({ where: { id: c.id }, create: data, update: data });
  }

  for (const [sort, s] of scholarships.entries()) {
    const data = { ...s, sort };
    await prisma.scholarship.upsert({ where: { id: s.id }, create: data, update: data });
  }

  for (const { password, ...user } of testUsers) {
    // Solo se crea si no existe: no pisa una contraseña cambiada después.
    await prisma.user.upsert({ where: { email: user.email }, create: { ...user, password: await bcrypt.hash(password, 10) }, update: {} });
  }

  const [u, c, s, users] = await Promise.all([prisma.university.count(), prisma.career.count(), prisma.scholarship.count(), prisma.user.count()]);
  console.log(`Seed listo: ${u} universidades, ${c} áreas, ${s} becas, ${users} usuarios.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
