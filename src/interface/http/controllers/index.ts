// Controladores: validan la entrada con los esquemas, llaman al caso de uso y responden.
// No contienen lógica de autenticación: eso lo ponen los routers con los middlewares.
import type { Request, RequestHandler } from "express";
import { UnauthorizedError } from "../../../domain/errors.js";
import { container } from "../../../infrastructure/container.js";
import * as s from "../schemas/index.js";

const { auth, universities, careers, scholarships, requests } = container;

/** Id del usuario autenticado. Siempre del token, nunca del body. */
function currentUserId(req: Request): number {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export const authController = {
  register: (async (req, res) => {
    res.status(201).json(await auth.register(s.registerBody.parse(req.body)));
  }) satisfies RequestHandler,
  login: (async (req, res) => {
    res.json(await auth.login(s.loginBody.parse(req.body)));
  }) satisfies RequestHandler,
  me: (async (req, res) => {
    res.json({ user: await auth.me(currentUserId(req)) });
  }) satisfies RequestHandler,
};

export const universityController = {
  list: (async (req, res) => {
    const { page, limit, type, q } = s.universityQuery.parse(req.query);
    res.json(await universities.list({ page, limit }, { type, q }));
  }) satisfies RequestHandler,
  get: (async (req, res) => {
    res.json(await universities.get(s.numericId.parse(req.params).id));
  }) satisfies RequestHandler,
  create: (async (req, res) => {
    res.status(201).json(await universities.create(s.universityBody.parse(req.body)));
  }) satisfies RequestHandler,
  update: (async (req, res) => {
    const { id } = s.numericId.parse(req.params);
    res.json(await universities.update(id, s.universityBody.parse(req.body)));
  }) satisfies RequestHandler,
  remove: (async (req, res) => {
    await universities.remove(s.numericId.parse(req.params).id);
    res.status(204).end();
  }) satisfies RequestHandler,
};

export const careerController = {
  list: (async (req, res) => {
    res.json(await careers.list(s.pageQuery.parse(req.query)));
  }) satisfies RequestHandler,
  get: (async (req, res) => {
    res.json(await careers.get(s.slugId.parse(req.params).id));
  }) satisfies RequestHandler,
  create: (async (req, res) => {
    res.status(201).json(await careers.create(s.newCareerBody.parse(req.body)));
  }) satisfies RequestHandler,
  update: (async (req, res) => {
    const { id } = s.slugId.parse(req.params);
    res.json(await careers.update(id, s.careerBody.parse(req.body)));
  }) satisfies RequestHandler,
  remove: (async (req, res) => {
    await careers.remove(s.slugId.parse(req.params).id);
    res.status(204).end();
  }) satisfies RequestHandler,
};

export const scholarshipController = {
  list: (async (req, res) => {
    res.json(await scholarships.list(s.pageQuery.parse(req.query)));
  }) satisfies RequestHandler,
};

export const pqrsRequestController = {
  create: (async (req, res) => {
    // Cualquier `userId` que venga en el body se ignora: el esquema no lo incluye.
    res.status(201).json(await requests.create(currentUserId(req), s.pqrsRequestBody.parse(req.body)));
  }) satisfies RequestHandler,
  listMine: (async (req, res) => {
    const { page, limit, status } = s.pqrsRequestQuery.parse(req.query);
    res.json(await requests.listMine(currentUserId(req), { page, limit }, status));
  }) satisfies RequestHandler,
  listAll: (async (req, res) => {
    const { page, limit, status } = s.pqrsRequestQuery.parse(req.query);
    res.json(await requests.listAll({ page, limit }, status));
  }) satisfies RequestHandler,
  updateStatus: (async (req, res) => {
    const { id } = s.numericId.parse(req.params);
    res.json(await requests.updateStatus(id, s.pqrsStatusBody.parse(req.body).status));
  }) satisfies RequestHandler,
};
