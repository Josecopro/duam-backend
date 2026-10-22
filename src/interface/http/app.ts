import cors from "cors";
import express, { type Express } from "express";
import { env } from "../../infrastructure/config/env.js";
import { errorHandler, notFound } from "./middlewares/errors.js";
import { api } from "./routes/index.js";

/** Configura la app de Express: CORS, JSON, rutas y manejo de errores. */
export function configureApp(app: Express): Express {
  app.disable("x-powered-by");
  // Solo los orígenes del frontend (CORS_ORIGINS); nunca "*".
  app.use(cors({ origin: env.corsOrigins, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] }));
  app.use(express.json({ limit: "10kb" }));
  app.use("/api", api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export const createApp = () => configureApp(express());
