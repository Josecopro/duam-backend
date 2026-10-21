// API de DUAM. En Vercel este archivo es el punto de entrada (export default de la app).
// En local se levanta con src/server.ts.
import { timingSafeEqual } from "node:crypto";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { pool } from "./db.js";
import { validatePqrs } from "./pqrs.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

// Las escrituras solo las hace el servidor de Next (server action) con la clave compartida API_KEY;
// el navegador nunca llama directo a esta API, así que no hace falta CORS.
const requireApiKey: RequestHandler = (req, res, next) => {
  const expected = process.env.API_KEY;
  const given = req.get("x-api-key") ?? "";
  if (expected && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return next();
  res.status(401).json({ error: "No autorizado" });
};

// Los datos públicos cambian poco: la CDN de Vercel los cachea 5 min y los sirve viejos mientras revalida.
const cachePublic: RequestHandler = (_req, res, next) => {
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  next();
};

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});

app.get("/api/universities", cachePublic, async (_req, res) => {
  const { rows } = await pool.query<{ name: string; url: string; type: "private" | "public" }>(
    "SELECT name, url, type FROM universities ORDER BY sort, name",
  );
  res.json({
    private: rows.filter((r) => r.type === "private").map(({ name, url }) => ({ name, url })),
    public: rows.filter((r) => r.type === "public").map(({ name, url }) => ({ name, url })),
  });
});

const careersQuery = `
  SELECT c.id, c.name, c.icon, c.image, c.description, c.summary, c.tone, c.symbol,
         COALESCE(array_agg(s.name ORDER BY s.sort) FILTER (WHERE s.name IS NOT NULL), '{}') AS subcategories
  FROM career_categories c
  LEFT JOIN career_subcategories s ON s.category_id = c.id`;

app.get("/api/careers", cachePublic, async (_req, res) => {
  const { rows } = await pool.query(`${careersQuery} GROUP BY c.id ORDER BY c.sort`);
  res.json(rows);
});

app.get("/api/careers/:id", cachePublic, async (req, res) => {
  const { rows } = await pool.query(`${careersQuery} WHERE c.id = $1 GROUP BY c.id`, [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: "Área no encontrada" });
    return;
  }
  res.json(rows[0]);
});

app.get("/api/scholarships", cachePublic, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, description, video_url AS "videoUrl", type, institution FROM scholarships ORDER BY sort`,
  );
  res.json(rows);
});

app.post("/api/pqrs", requireApiKey, async (req, res) => {
  const result = validatePqrs(req.body);
  if ("errors" in result) {
    res.status(400).json({ errors: result.errors });
    return;
  }
  const { nombre, correo, comentario } = result.data;
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO pqrs_tickets (name, email, message) VALUES ($1, $2, $3) RETURNING id",
    [nombre, correo, comentario],
  );
  res.status(201).json({ id: rows[0].id });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Express 5 pasa aquí los errores de handlers async. Respuesta JSON sin filtrar detalles internos.
const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err?.status === "number" && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Error interno" : err.message });
};
app.use(onError);

export default app;
