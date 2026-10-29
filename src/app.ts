// Arma la app Express (la configuración real vive en la capa interface: src/interface/http/app.ts).
import express from "express";
import { configureApp } from "./interface/http/app.js";

export default configureApp(express());
