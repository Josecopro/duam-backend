import type { Career, CareerInput, CareerRepository } from "../domain/career.js";
import { NotFoundError } from "../domain/errors.js";
import type { PageQuery } from "../domain/pagination.js";
import type { ScholarshipRepository } from "../domain/scholarship.js";
import type { UniversityFilters, UniversityInput, UniversityRepository } from "../domain/university.js";

// Casos de uso de los catálogos. Lectura pública; escritura solo admin (lo exige el router).

export function makeUniversityUseCases(repo: UniversityRepository) {
  return {
    list: (query: PageQuery, filters: UniversityFilters) => repo.list(query, filters),
    async get(id: number) {
      const university = await repo.findById(id);
      if (!university) throw new NotFoundError("Universidad no encontrada");
      return university;
    },
    create: (data: UniversityInput) => repo.create(data),
    update: (id: number, data: UniversityInput) => repo.update(id, data),
    remove: (id: number) => repo.delete(id),
  };
}

export function makeCareerUseCases(repo: CareerRepository) {
  return {
    list: (query: PageQuery) => repo.list(query),
    async get(id: string) {
      const career = await repo.findById(id);
      if (!career) throw new NotFoundError("Área no encontrada");
      return career;
    },
    create: (data: Career) => repo.create(data),
    update: (id: string, data: CareerInput) => repo.update(id, data),
    remove: (id: string) => repo.delete(id),
  };
}

export function makeScholarshipUseCases(repo: ScholarshipRepository) {
  return { list: (query: PageQuery) => repo.list(query) };
}
