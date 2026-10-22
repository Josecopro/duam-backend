// Punto de entrada para Vercel: detecta `src/app.ts` con Express y usa su export default.
// La app real se arma en la capa interface (src/interface/http/app.ts).
import express from "express";
import { configureApp } from "./interface/http/app.js";

export default configureApp(express());
