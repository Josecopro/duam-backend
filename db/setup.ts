// Crea el esquema y carga/actualiza los datos de db/seed/*.json (que vienen del sitio original).
// No toca pqrs_tickets. Uso: npm run db:setup
import { readFileSync } from "node:fs";
import { pool } from "../src/db.js";

const seed = (file: string) => JSON.parse(readFileSync(new URL(`./seed/${file}`, import.meta.url), "utf8"));

const universities = seed("universities.json") as Record<"private" | "public", { name: string; url: string }[]>;
const { categories } = seed("careers.json") as {
  categories: { id: string; name: string; icon: string; image: string; description: string; summary: string; tone: string; symbol: string; subcategories: string[] }[];
};
const { scholarships } = seed("scholarships.json") as {
  scholarships: { id: string; title: string; description: string; videoUrl: string; type: string; institution: string }[];
};

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));

  for (const type of ["private", "public"] as const) {
    for (const [i, u] of universities[type].entries()) {
      await client.query(
        `INSERT INTO universities (name, url, type, sort) VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, type = EXCLUDED.type, sort = EXCLUDED.sort`,
        [u.name, u.url, type, i],
      );
    }
  }

  for (const [i, c] of categories.entries()) {
    await client.query(
      `INSERT INTO career_categories (id, name, icon, image, description, summary, tone, symbol, sort)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, image = EXCLUDED.image,
         description = EXCLUDED.description, summary = EXCLUDED.summary, tone = EXCLUDED.tone, symbol = EXCLUDED.symbol, sort = EXCLUDED.sort`,
      [c.id, c.name, c.icon, c.image, c.description, c.summary, c.tone, c.symbol, i],
    );
    // Las subdivisiones se reemplazan completas: el JSON es la fuente de verdad hasta que exista el panel admin.
    await client.query("DELETE FROM career_subcategories WHERE category_id = $1", [c.id]);
    for (const [j, name] of c.subcategories.entries()) {
      await client.query("INSERT INTO career_subcategories (category_id, name, sort) VALUES ($1, $2, $3)", [c.id, name, j]);
    }
  }

  for (const [i, s] of scholarships.entries()) {
    await client.query(
      `INSERT INTO scholarships (id, title, description, video_url, type, institution, sort) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, video_url = EXCLUDED.video_url,
         type = EXCLUDED.type, institution = EXCLUDED.institution, sort = EXCLUDED.sort`,
      [s.id, s.title, s.description, s.videoUrl, s.type, s.institution, i],
    );
  }

  await client.query("COMMIT");
  console.log(
    `Listo: ${universities.private.length + universities.public.length} universidades, ${categories.length} áreas, ${scholarships.length} becas.`,
  );
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
