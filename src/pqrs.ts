// Validación del PQRS: mismas reglas que el formulario del frontend (organisms/PqrsForm.tsx),
// más límites de longitud que también impone la tabla pqrs_tickets.
export interface PqrsInput {
  nombre: string;
  correo: string;
  comentario: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePqrs(body: unknown): { data: PqrsInput } | { errors: Partial<Record<keyof PqrsInput, string>> } {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const data = { nombre: str(b.nombre), correo: str(b.correo), comentario: str(b.comentario) };
  const errors: Partial<Record<keyof PqrsInput, string>> = {};

  if (!data.nombre) errors.nombre = "Este campo es obligatorio";
  else if (data.nombre.length > 120) errors.nombre = "Máximo 120 caracteres";

  if (!data.correo) errors.correo = "Este campo es obligatorio";
  else if (data.correo.length > 254 || !EMAIL.test(data.correo)) errors.correo = "Ingresa un correo electrónico válido";

  if (!data.comentario) errors.comentario = "Este campo es obligatorio";
  else if (data.comentario.length < 10) errors.comentario = "El mensaje debe tener al menos 10 caracteres";
  else if (data.comentario.length > 5000) errors.comentario = "Máximo 5000 caracteres";

  return Object.keys(errors).length ? { errors } : { data };
}
