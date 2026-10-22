// Pruebas de la API contra Postgres real (la base de DATABASE_URL, con migraciones y seed aplicados).
// Uso: npm test. Cada prueba limpia lo que crea.
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { prisma } from "../src/infrastructure/prisma/client.js";

const server = app.listen(0);
const base = `http://localhost:${(server.address() as AddressInfo).port}/api`;
const stamp = Date.now();
const created = { users: [] as number[], universities: [] as number[], careers: [] as string[] };

type Json = Record<string, any>;
async function call(method: string, path: string, opts: { body?: unknown; token?: string; headers?: Record<string, string> } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(opts.body !== undefined && { "content-type": "application/json" }),
      ...(opts.token && { authorization: `Bearer ${opts.token}` }),
      ...opts.headers,
    },
    body: opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: (text ? JSON.parse(text) : null) as Json };
}

let adminToken = "";
let userToken = "";
let userId = 0;

before(async () => {
  const admin = await call("POST", "/auth/login", { body: { email: "admin@duam.co", password: "AdminDuam2026!" } });
  assert.equal(admin.status, 200, "el seed debe crear admin@duam.co");
  adminToken = admin.json.token;
  const reg = await call("POST", "/auth/register", { body: { name: "Prueba Uno", email: `prueba${stamp}@duam.test`, password: "clave-segura-1" } });
  assert.equal(reg.status, 201);
  userToken = reg.json.token;
  userId = reg.json.user.id;
  created.users.push(userId);
});

after(async () => {
  await prisma.pqrsRequest.deleteMany({ where: { userId: { in: created.users } } });
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });
  await prisma.university.deleteMany({ where: { id: { in: created.universities } } });
  await prisma.career.deleteMany({ where: { id: { in: created.careers } } });
  server.close();
  await prisma.$disconnect();
});

describe("auth", () => {
  test("register: 201, rol user, sin password en la respuesta y con hash bcrypt en la base", async () => {
    const email = `dos${stamp}@duam.test`;
    const res = await call("POST", "/auth/register", { body: { name: "Prueba Dos", email: email.toUpperCase(), password: "otra-clave-2", role: "admin" } });
    assert.equal(res.status, 201);
    created.users.push(res.json.user.id);
    assert.equal(res.json.user.role, "user", "el rol del body se ignora");
    assert.equal(res.json.user.email, email, "el email se normaliza a minúsculas");
    assert.ok(!("password" in res.json.user));
    assert.ok(!JSON.stringify(res.json).includes("otra-clave-2"));
    const row = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert.match(row.password, /^\$2[aby]\$10\$/);
  });

  test("register con email existente: 409 con detalle en el campo email", async () => {
    const res = await call("POST", "/auth/register", { body: { name: "Repetido", email: "admin@duam.co", password: "clave-segura-1" } });
    assert.equal(res.status, 409);
    assert.ok(res.json.details.email);
  });

  test("register inválido: 400 con errores por campo", async () => {
    const res = await call("POST", "/auth/register", { body: { name: "A", email: "no-es-email", password: "corta" } });
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.json.details).sort(), ["email", "name", "password"]);
  });

  test("login: JWT firmado con expiración y payload solo con id y role", async () => {
    const res = await call("POST", "/auth/login", { body: { email: "usuario@duam.co", password: "UsuarioDuam2026!" } });
    assert.equal(res.status, 200);
    assert.ok(!("password" in res.json.user));
    const payload = jwt.verify(res.json.token, process.env.JWT_SECRET!) as Json;
    assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "id", "role"]);
    assert.ok(payload.exp > payload.iat);
  });

  test("login fallido: 401 con el mismo mensaje para email inexistente y contraseña incorrecta", async () => {
    const wrongPass = await call("POST", "/auth/login", { body: { email: "usuario@duam.co", password: "incorrecta" } });
    const noUser = await call("POST", "/auth/login", { body: { email: `nadie${stamp}@duam.test`, password: "incorrecta" } });
    assert.equal(wrongPass.status, 401);
    assert.equal(noUser.status, 401);
    assert.equal(wrongPass.json.error, noUser.json.error);
  });

  test("/me: 200 con token; 401 sin token, mal formado, firmado con otra clave o expirado", async () => {
    assert.equal((await call("GET", "/auth/me", { token: userToken })).json.user.id, userId);
    assert.equal((await call("GET", "/auth/me")).status, 401);
    assert.equal((await call("GET", "/auth/me", { headers: { authorization: `Token ${userToken}` } })).status, 401);
    assert.equal((await call("GET", "/auth/me", { token: "basura" })).status, 401);
    const forged = jwt.sign({ id: userId, role: "admin" }, "otra-clave-que-no-es-la-del-servidor-1234567890");
    assert.equal((await call("GET", "/auth/me", { token: forged })).status, 401);
    const expired = jwt.sign({ id: userId, role: "user" }, process.env.JWT_SECRET!, { expiresIn: -10 });
    const res = await call("GET", "/auth/me", { token: expired });
    assert.equal(res.status, 401);
    assert.match(res.json.error, /expirada/);
  });
});

describe("catálogo: universidades", () => {
  test("GET público paginado con { pagination, data }", async () => {
    const res = await call("GET", "/universidades?page=2&limit=5");
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.pagination, { page: 2, limit: 5, total: 21, totalPages: 5 });
    assert.equal(res.json.data.length, 5);
    assert.deepEqual(Object.keys(res.json.data[0]).sort(), ["id", "name", "type", "url"]);
  });

  test("filtros por tipo y búsqueda", async () => {
    assert.equal((await call("GET", "/universidades?type=public&limit=50")).json.pagination.total, 8);
    const res = await call("GET", "/universidades?q=medell");
    assert.deepEqual(res.json.data.map((u: Json) => u.name), ["Universidad de Medellín"]);
  });

  test("query inválida: 400", async () => {
    const res = await call("GET", "/universidades?page=abc&limit=500&type=otra");
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.json.details).sort(), ["limit", "page", "type"]);
  });

  test("GET /:id: 200, 404 si no existe, 400 si el id no es numérico", async () => {
    const first = (await call("GET", "/universidades?limit=1")).json.data[0];
    assert.equal((await call("GET", `/universidades/${first.id}`)).json.name, first.name);
    assert.equal((await call("GET", "/universidades/999999")).status, 404);
    assert.equal((await call("GET", "/universidades/abc")).status, 400);
  });

  test("escritura: 401 sin token, 403 con usuario normal", async () => {
    const body = { name: `U Prueba ${stamp}`, url: "https://ejemplo.edu.co", type: "private" };
    assert.equal((await call("POST", "/universidades", { body })).status, 401);
    assert.equal((await call("POST", "/universidades", { body, token: userToken })).status, 403);
    assert.equal((await call("PUT", "/universidades/1", { body, token: userToken })).status, 403);
    assert.equal((await call("DELETE", "/universidades/1", { token: userToken })).status, 403);
  });

  test("CRUD admin: crear 201, duplicado 409, editar 200, borrar 204 y luego 404", async () => {
    const body = { name: `U Prueba ${stamp}`, url: "https://ejemplo.edu.co", type: "private" };
    const res = await call("POST", "/universidades", { body, token: adminToken });
    assert.equal(res.status, 201);
    created.universities.push(res.json.id);
    const dup = await call("POST", "/universidades", { body, token: adminToken });
    assert.equal(dup.status, 409);
    assert.ok(dup.json.details.name);
    const upd = await call("PUT", `/universidades/${res.json.id}`, { body: { ...body, type: "public" }, token: adminToken });
    assert.equal(upd.json.type, "public");
    assert.equal((await call("PUT", "/universidades/999999", { body, token: adminToken })).status, 404);
    assert.equal((await call("POST", "/universidades", { body: { name: "X", url: "ftp://x", type: "x" }, token: adminToken })).status, 400);
    assert.equal((await call("DELETE", `/universidades/${res.json.id}`, { token: adminToken })).status, 204);
    assert.equal((await call("DELETE", `/universidades/${res.json.id}`, { token: adminToken })).status, 404);
  });
});

describe("catálogo: carreras", () => {
  const career = {
    id: `area-prueba-${stamp}`,
    name: "Área de prueba",
    icon: "🧪",
    image: "/images/wIbAFgE.png",
    description: "Descripción de prueba",
    summary: "Resumen de prueba",
    tone: "primary",
    symbol: "code",
    programs: ["Programa A", "Programa B"],
  };

  test("GET público paginado y GET /:id por slug", async () => {
    const res = await call("GET", "/carreras");
    assert.equal(res.json.pagination.total, 7);
    assert.equal(res.json.data[0].id, "ingenierias");
    const salud = await call("GET", "/carreras/salud");
    assert.ok(salud.json.programs.includes("Medicina"));
    assert.equal((await call("GET", "/carreras/no-existe")).status, 404);
    assert.equal((await call("GET", "/carreras/MAL ID")).status, 400);
  });

  test("CRUD admin con 403 para usuario normal", async () => {
    assert.equal((await call("POST", "/carreras", { body: career, token: userToken })).status, 403);
    const res = await call("POST", "/carreras", { body: career, token: adminToken });
    assert.equal(res.status, 201);
    created.careers.push(career.id);
    assert.equal((await call("POST", "/carreras", { body: career, token: adminToken })).status, 409);
    const { id: _id, ...rest } = career;
    const upd = await call("PUT", `/carreras/${career.id}`, { body: { ...rest, programs: ["Solo uno"] }, token: adminToken });
    assert.deepEqual(upd.json.programs, ["Solo uno"]);
    assert.equal((await call("DELETE", `/carreras/${career.id}`, { token: adminToken })).status, 204);
  });
});

describe("interacción: solicitudes PQRS", () => {
  test("sin sesión: 401", async () => {
    assert.equal((await call("POST", "/solicitudes", { body: {} })).status, 401);
    assert.equal((await call("GET", "/solicitudes/mias")).status, 401);
  });

  test("crear: 201 a nombre del usuario del token aunque el body diga otro userId", async () => {
    const uni = (await call("GET", "/universidades?limit=1")).json.data[0];
    const adminId = (await call("GET", "/auth/me", { token: adminToken })).json.user.id;
    const res = await call("POST", "/solicitudes", {
      body: { type: "peticion", message: "Quiero información sobre becas", universityId: uni.id, userId: adminId },
      token: userToken,
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.status, "new");
    const row = await prisma.pqrsRequest.findUniqueOrThrow({ where: { id: res.json.id } });
    assert.equal(row.userId, userId, "el userId sale del token, no del body");
  });

  test("crear inválido: 400; universidad inexistente: 404", async () => {
    const bad = await call("POST", "/solicitudes", { body: { type: "otro", message: "corto", universityId: "x" }, token: userToken });
    assert.equal(bad.status, 400);
    assert.deepEqual(Object.keys(bad.json.details).sort(), ["message", "type", "universityId"]);
    const missing = await call("POST", "/solicitudes", { body: { type: "queja", message: "Mensaje suficientemente largo", universityId: 999999 }, token: userToken });
    assert.equal(missing.status, 404);
  });

  test("/mias: solo las del usuario; listado completo: 403 para usuario, 200 para admin con datos del autor", async () => {
    const mine = await call("GET", "/solicitudes/mias", { token: userToken });
    assert.equal(mine.status, 200);
    assert.ok(mine.json.pagination.total >= 1);
    assert.ok(mine.json.data.every((r: Json) => !("user" in r)));
    const mineIds = new Set(mine.json.data.map((r: Json) => r.id));
    const adminMine = await call("GET", "/solicitudes/mias?limit=100", { token: adminToken });
    assert.ok(adminMine.json.data.every((r: Json) => !mineIds.has(r.id)), "el admin no ve en /mias las solicitudes de otro usuario");

    assert.equal((await call("GET", "/solicitudes", { token: userToken })).status, 403);
    const all = await call("GET", "/solicitudes?status=new", { token: adminToken });
    assert.equal(all.status, 200);
    const item = all.json.data.find((r: Json) => r.user?.id === userId);
    assert.ok(item, "el admin ve la solicitud del usuario");
    assert.deepEqual(Object.keys(item.user).sort(), ["email", "id", "name"], "sin password del autor");
  });

  test("cambiar estado: solo admin", async () => {
    const mine = (await call("GET", "/solicitudes/mias", { token: userToken })).json.data[0];
    assert.equal((await call("PATCH", `/solicitudes/${mine.id}`, { body: { status: "closed" }, token: userToken })).status, 403);
    const res = await call("PATCH", `/solicitudes/${mine.id}`, { body: { status: "closed" }, token: adminToken });
    assert.equal(res.json.status, "closed");
    assert.equal((await call("PATCH", "/solicitudes/999999", { body: { status: "closed" }, token: adminToken })).status, 404);
  });

  test("borrar una universidad con solicitudes: 409 (error de FK de Prisma capturado)", async () => {
    const mine = (await call("GET", "/solicitudes/mias", { token: userToken })).json.data[0];
    const res = await call("DELETE", `/universidades/${mine.university.id}`, { token: adminToken });
    assert.equal(res.status, 409);
    assert.match(res.json.error, /solicitudes/);
  });
});

describe("transversal", () => {
  test("becas paginadas", async () => {
    const res = await call("GET", "/becas");
    assert.equal(res.json.pagination.total, 4);
  });

  test("CORS: solo el origen del frontend configurado", async () => {
    const ok = await call("GET", "/universidades?limit=1", { headers: { origin: "http://localhost:3000" } });
    assert.equal(ok.headers.get("access-control-allow-origin"), "http://localhost:3000");
    const evil = await call("GET", "/universidades?limit=1", { headers: { origin: "https://evil.example" } });
    assert.equal(evil.headers.get("access-control-allow-origin"), null);
  });

  test("errores: 404 JSON en rutas desconocidas, JSON mal formado 400, sin stack trace", async () => {
    const unknown = await call("GET", "/nada");
    assert.equal(unknown.status, 404);
    const malformed = await call("POST", "/auth/login", { body: "{malo", headers: { "content-type": "application/json" } });
    assert.equal(malformed.status, 400);
    for (const r of [unknown, malformed]) assert.ok(!JSON.stringify(r.json).includes("    at "), "sin stack trace");
  });
});
