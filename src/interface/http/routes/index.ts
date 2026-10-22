// Routers. Aquí (y solo aquí) se decide quién puede llamar a cada endpoint.
import { Router } from "express";
import { prisma } from "../../../infrastructure/prisma/client.js";
import {
  authController,
  careerController,
  pqrsRequestController,
  scholarshipController,
  universityController,
} from "../controllers/index.js";
import { authenticate, soloAdmin } from "../middlewares/auth.js";

const auth = Router();
auth.post("/register", authController.register);
auth.post("/login", authController.login);
auth.get("/me", authenticate, authController.me);

// Catálogo 1: lectura pública, escritura solo admin.
const universidades = Router();
universidades.get("/", universityController.list);
universidades.get("/:id", universityController.get);
universidades.post("/", authenticate, soloAdmin, universityController.create);
universidades.put("/:id", authenticate, soloAdmin, universityController.update);
universidades.delete("/:id", authenticate, soloAdmin, universityController.remove);

// Catálogo 2: lectura pública, escritura solo admin.
const carreras = Router();
carreras.get("/", careerController.list);
carreras.get("/:id", careerController.get);
carreras.post("/", authenticate, soloAdmin, careerController.create);
carreras.put("/:id", authenticate, soloAdmin, careerController.update);
carreras.delete("/:id", authenticate, soloAdmin, careerController.remove);

const becas = Router();
becas.get("/", scholarshipController.list);

// Interacción: todo requiere sesión; ver todas o cambiar estado, solo admin.
const solicitudes = Router();
solicitudes.use(authenticate);
solicitudes.post("/", pqrsRequestController.create);
solicitudes.get("/mias", pqrsRequestController.listMine);
solicitudes.get("/", soloAdmin, pqrsRequestController.listAll);
solicitudes.patch("/:id", soloAdmin, pqrsRequestController.updateStatus);

export const api = Router();
api.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});
api.use("/auth", auth);
api.use("/universidades", universidades);
api.use("/carreras", carreras);
api.use("/becas", becas);
api.use("/solicitudes", solicitudes);
