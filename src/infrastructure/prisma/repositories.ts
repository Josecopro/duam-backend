// Implementaciones Prisma de los repositorios del dominio.
import type { Career, CareerInput, CareerRepository } from "../../domain/career.js";
import { ConflictError, NotFoundError } from "../../domain/errors.js";
import { type PageQuery, toPage } from "../../domain/pagination.js";
import type { PqrsRequest, PqrsRequestFilters, PqrsRequestRepository, RequestStatus } from "../../domain/pqrs-request.js";
import type { ScholarshipRepository } from "../../domain/scholarship.js";
import type { UniversityFilters, UniversityInput, UniversityRepository } from "../../domain/university.js";
import type { User, UserRepository } from "../../domain/user.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "./client.js";
import { translate } from "./errors.js";

const skipTake = ({ page, limit }: PageQuery) => ({ skip: (page - 1) * limit, take: limit });

export const userRepository: UserRepository = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }) as Promise<User | null>,
  findById: (id) => prisma.user.findUnique({ where: { id } }) as Promise<User | null>,
  create: (data) =>
    translate(() => prisma.user.create({ data }) as Promise<User>, { conflict: "Ya existe una cuenta con este correo" }).catch(withField("email")),
};

const universitySelect = { id: true, name: true, url: true, type: true } satisfies Prisma.UniversitySelect;
const UNIVERSITY_EXISTS = "Ya existe una universidad con ese nombre";

export const universityRepository: UniversityRepository = {
  async list(query, { type, q }: UniversityFilters) {
    const where: Prisma.UniversityWhereInput = {
      ...(type && { type }),
      ...(q && { name: { contains: q, mode: "insensitive" } }),
    };
    const [data, total] = await prisma.$transaction([
      prisma.university.findMany({ where, select: universitySelect, orderBy: [{ type: "asc" }, { name: "asc" }], ...skipTake(query) }),
      prisma.university.count({ where }),
    ]);
    return toPage(data, total, query);
  },
  findById: (id) => prisma.university.findUnique({ where: { id }, select: universitySelect }),
  create: (data: UniversityInput) =>
    translate(() => prisma.university.create({ data, select: universitySelect }), { conflict: UNIVERSITY_EXISTS }).catch(withField("name")),
  update: (id, data) =>
    translate(() => prisma.university.update({ where: { id }, data, select: universitySelect }), {
      notFound: "Universidad no encontrada",
      conflict: UNIVERSITY_EXISTS,
    }).catch(withField("name")),
  delete: (id) =>
    translate(
      async () => {
        await prisma.university.delete({ where: { id } });
      },
      { notFound: "Universidad no encontrada", conflict: "No se puede eliminar: la universidad tiene solicitudes asociadas" },
    ),
};

const careerSelect = {
  id: true,
  name: true,
  icon: true,
  image: true,
  description: true,
  summary: true,
  tone: true,
  symbol: true,
  programs: true,
  sort: true,
} satisfies Prisma.CareerSelect;

export const careerRepository: CareerRepository = {
  async list(query) {
    const [data, total] = await prisma.$transaction([
      prisma.career.findMany({ select: careerSelect, orderBy: [{ sort: "asc" }, { name: "asc" }], ...skipTake(query) }),
      prisma.career.count(),
    ]);
    return toPage(data as Career[], total, query);
  },
  findById: (id) => prisma.career.findUnique({ where: { id }, select: careerSelect }) as Promise<Career | null>,
  create: (data) =>
    translate(() => prisma.career.create({ data, select: careerSelect }) as Promise<Career>, {
      conflict: "Ya existe un área con ese identificador",
    }).catch(withField("id")),
  update: (id, data: CareerInput) =>
    translate(() => prisma.career.update({ where: { id }, data, select: careerSelect }) as Promise<Career>, { notFound: "Área no encontrada" }),
  delete: (id) =>
    translate(
      async () => {
        await prisma.career.delete({ where: { id } });
      },
      { notFound: "Área no encontrada" },
    ),
};

export const scholarshipRepository: ScholarshipRepository = {
  async list(query) {
    const [data, total] = await prisma.$transaction([
      prisma.scholarship.findMany({
        select: { id: true, title: true, description: true, videoUrl: true, type: true, institution: true },
        orderBy: { sort: "asc" },
        ...skipTake(query),
      }),
      prisma.scholarship.count(),
    ]);
    return toPage(data, total, query);
  },
};

const requestSelect = (withUser: boolean) =>
  ({
    id: true,
    type: true,
    message: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    university: { select: { id: true, name: true } },
    // Nunca se selecciona user.password.
    user: withUser ? { select: { id: true, name: true, email: true } } : false,
  }) satisfies Prisma.PqrsRequestSelect;

export const pqrsRequestRepository: PqrsRequestRepository = {
  async create(data) {
    // FK hacia universidades: si no existe, Prisma lanza P2003 → aquí se traduce a 404 con detalle por campo.
    const university = await prisma.university.findUnique({ where: { id: data.universityId }, select: { id: true } });
    if (!university) throw new NotFoundError("La universidad seleccionada no existe");
    return translate(() => prisma.pqrsRequest.create({ data, select: requestSelect(false) }) as Promise<PqrsRequest>);
  },
  async list(query, { status, userId }: PqrsRequestFilters, { withUser }) {
    const where: Prisma.PqrsRequestWhereInput = { ...(status && { status }), ...(userId && { userId }) };
    const [data, total] = await prisma.$transaction([
      prisma.pqrsRequest.findMany({ where, select: requestSelect(withUser), orderBy: { createdAt: "desc" }, ...skipTake(query) }),
      prisma.pqrsRequest.count({ where }),
    ]);
    return toPage(data as PqrsRequest[], total, query);
  },
  updateStatus: (id, status: RequestStatus) =>
    translate(() => prisma.pqrsRequest.update({ where: { id }, data: { status }, select: requestSelect(true) }) as Promise<PqrsRequest>, {
      notFound: "Solicitud no encontrada",
    }),
};

/** Añade el detalle por campo a un ConflictError (para mostrarlo junto al input en el frontend). */
function withField(field: string) {
  return (err: unknown): never => {
    if (err instanceof ConflictError) throw new ConflictError(err.message, { [field]: err.message });
    throw err;
  };
}

