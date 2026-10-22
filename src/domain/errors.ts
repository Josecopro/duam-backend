// Errores del dominio. Cada uno sabe su código HTTP; la capa interface solo los traduce a la respuesta.
export class DomainError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Errores por campo, para mostrarlos junto a cada input en el frontend. */
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(details: Record<string, string>, message = "Datos inválidos") {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Se requiere iniciar sesión") {
    super(message, 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "No tienes permiso para realizar esta acción") {
    super(message, 403);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Recurso no encontrado") {
    super(message, 404);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, string>) {
    super(message, 409, details);
  }
}
