// Esquemas de validación de body, params y query. Un ZodError se responde como 400 con errores por campo.
import { z } from "zod";

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} es obligatorio` })
    .trim()
    .min(min, min <= 1 ? `${label} es obligatorio` : `${label} debe tener al menos ${min} caracteres`)
    .max(max, `${label} admite máximo ${max} caracteres`);

// ── Comunes ────────────────────────────────────────────────────────────────
export const pageQuery = z.object({
  page: z.coerce.number({ error: "page debe ser un número" }).int("page debe ser entero").min(1, "page debe ser ≥ 1").default(1),
  limit: z.coerce.number({ error: "limit debe ser un número" }).int("limit debe ser entero").min(1, "limit debe ser ≥ 1").max(100, "limit admite máximo 100").default(12),
});

export const numericId = z.object({
  id: z.coerce.number({ error: "El id debe ser numérico" }).int("El id debe ser entero").positive("El id debe ser positivo"),
});

export const slugId = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El id solo admite minúsculas, números y guiones")
    .max(60),
});

// ── Auth ───────────────────────────────────────────────────────────────────
const email = z
  .string({ error: "El correo es obligatorio" })
  .trim()
  .toLowerCase()
  .max(254, "El correo es demasiado largo")
  .pipe(z.email("Ingresa un correo electrónico válido"));

export const registerBody = z.object({
  name: text(2, 120, "El nombre"),
  email,
  // bcrypt solo usa los primeros 72 bytes.
  password: z.string({ error: "La contraseña es obligatoria" }).min(8, "La contraseña debe tener al menos 8 caracteres").max(72, "La contraseña admite máximo 72 caracteres"),
});

export const loginBody = z.object({
  email,
  password: z.string({ error: "La contraseña es obligatoria" }).min(1, "La contraseña es obligatoria").max(72),
});

// ── Universidades ──────────────────────────────────────────────────────────
const universityType = z.enum(["private", "public"], { error: "El tipo debe ser private o public" });

export const universityQuery = pageQuery.extend({
  type: universityType.optional(),
  q: z.string().trim().max(100, "La búsqueda admite máximo 100 caracteres").optional(),
});

export const universityBody = z.object({
  name: text(2, 160, "El nombre"),
  url: z.url({ protocol: /^https?$/, error: "Ingresa una URL válida (http o https)" }).max(300),
  type: universityType,
});

// ── Carreras (áreas) ───────────────────────────────────────────────────────
const careerFields = {
  name: text(2, 120, "El nombre"),
  icon: text(1, 16, "El ícono"),
  image: text(1, 300, "La imagen"),
  description: text(2, 300, "La descripción"),
  summary: text(2, 600, "El resumen"),
  tone: z.enum(["primary", "secondary", "success", "accent"], { error: "Tono inválido" }),
  symbol: text(1, 40, "El símbolo"),
  programs: z.array(text(1, 120, "Cada programa"), { error: "programs debe ser una lista" }).max(100),
  sort: z.coerce.number().int().min(0).max(1000).default(0),
};

export const careerBody = z.object(careerFields);
export const newCareerBody = z.object({ ...careerFields, id: slugId.shape.id });

// ── Solicitudes PQRS ───────────────────────────────────────────────────────
const requestStatus = z.enum(["new", "in_progress", "closed"], { error: "Estado inválido" });

export const pqrsRequestBody = z.object({
  type: z.enum(["peticion", "queja", "reclamo", "sugerencia"], { error: "Elige el tipo de solicitud" }),
  message: text(10, 5000, "El mensaje"),
  universityId: z.coerce.number({ error: "Elige una universidad" }).int().positive("Elige una universidad"),
});

export const pqrsRequestQuery = pageQuery.extend({ status: requestStatus.optional() });
export const pqrsStatusBody = z.object({ status: requestStatus });
