// Pruebas de la API contra una base real. Requiere DATABASE_URL con los datos cargados (npm run db:setup).
// Uso: npm test
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import { pool } from "../src/db.js";

process.env.API_KEY = "clave-de-prueba";
const server = app.listen(0);
const base = `http://localhost:${(server.address() as AddressInfo).port}/api`;
const createdIds: number[] = [];

before(() => new Promise((resolve) => server.once("listening", resolve)).catch(() => {}));
after(async () => {
  if (createdIds.length) await pool.query("DELETE FROM pqrs_tickets WHERE id = ANY($1)", [createdIds]);
  server.close();
  await pool.end();
});

const postPqrs = (body: unknown, key = "clave-de-prueba") =>
  fetch(`${base}/pqrs`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key }, body: JSON.stringify(body) });

test("health responde ok", async () => {
  const res = await fetch(`${base}/health`);
  assert.deepEqual(await res.json(), { ok: true });
});

test("universidades: 13 privadas y 8 oficiales, con caché pública", async () => {
  const res = await fetch(`${base}/universities`);
  const data = await res.json();
  assert.equal(data.private.length, 13);
  assert.equal(data.public.length, 8);
  assert.deepEqual(Object.keys(data.private[0]).sort(), ["name", "url"]);
  assert.match(res.headers.get("cache-control") ?? "", /s-maxage=300/);
});

test("carreras: 7 áreas en orden con subdivisiones", async () => {
  const data = await (await fetch(`${base}/careers`)).json();
  assert.equal(data.length, 7);
  assert.equal(data[0].id, "ingenierias");
  assert.equal(data[0].subcategories[0], "Ingeniería de Sistemas");
  assert.equal(data.reduce((n: number, c: { subcategories: string[] }) => n + c.subcategories.length, 0), 56);
});

test("carrera por id y 404 si no existe", async () => {
  const salud = await (await fetch(`${base}/careers/salud`)).json();
  assert.equal(salud.name, "Salud");
  assert.equal(salud.tone, "success");
  const missing = await fetch(`${base}/careers/no-existe`);
  assert.equal(missing.status, 404);
});

test("becas: 4 con videoUrl", async () => {
  const data = await (await fetch(`${base}/scholarships`)).json();
  assert.equal(data.length, 4);
  assert.match(data[0].videoUrl, /^https:\/\/www\.youtube\.com\/embed\//);
});

test("PQRS sin clave o con clave incorrecta: 401", async () => {
  const body = { nombre: "Ana", correo: "ana@correo.com", comentario: "Mensaje de prueba" };
  assert.equal((await postPqrs(body, "")).status, 401);
  assert.equal((await postPqrs(body, "otra-clave-de-prueb")).status, 401);
});

test("PQRS inválido: 400 con errores por campo", async () => {
  const res = await postPqrs({ nombre: " ", correo: "ana@", comentario: "corto" });
  assert.equal(res.status, 400);
  assert.deepEqual(Object.keys((await res.json()).errors).sort(), ["comentario", "correo", "nombre"]);
});

test("PQRS demasiado grande: 413", async () => {
  const res = await postPqrs({ nombre: "Ana", correo: "ana@correo.com", comentario: "x".repeat(20_000) });
  assert.equal(res.status, 413);
});

test("PQRS válido: 201 y queda guardado", async () => {
  const res = await postPqrs({ nombre: " Ana ", correo: "ana@correo.com", comentario: "Quiero información sobre becas" });
  assert.equal(res.status, 201);
  const { id } = await res.json();
  createdIds.push(id);
  const { rows } = await pool.query("SELECT name, email, status FROM pqrs_tickets WHERE id = $1", [id]);
  assert.deepEqual(rows[0], { name: "Ana", email: "ana@correo.com", status: "new" });
});

test("ruta inexistente: 404 JSON", async () => {
  const res = await fetch(`${base}/nada`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, "Ruta no encontrada");
});
