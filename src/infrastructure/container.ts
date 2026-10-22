// Composición: conecta los casos de uso (application) con sus implementaciones (infrastructure).
import { makeAuthUseCases } from "../application/auth.js";
import { makeCareerUseCases, makeScholarshipUseCases, makeUniversityUseCases } from "../application/catalog.js";
import { makePqrsRequestUseCases } from "../application/pqrs-requests.js";
import {
  careerRepository,
  pqrsRequestRepository,
  scholarshipRepository,
  universityRepository,
  userRepository,
} from "./prisma/repositories.js";
import { bcryptHasher } from "./security/bcrypt-hasher.js";
import { jwtTokenService } from "./security/jwt-token-service.js";

export const container = {
  tokens: jwtTokenService,
  auth: makeAuthUseCases(userRepository, bcryptHasher, jwtTokenService),
  universities: makeUniversityUseCases(universityRepository),
  careers: makeCareerUseCases(careerRepository),
  scholarships: makeScholarshipUseCases(scholarshipRepository),
  requests: makePqrsRequestUseCases(pqrsRequestRepository),
};
