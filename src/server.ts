// Punto de entrada: local (npm run dev) y en Render (npm start). Render define PORT.
import app from "./app.js";
import { env } from "./infrastructure/config/env.js";

app.listen(env.port, () => console.log(`API de DUAM en http://localhost:${env.port}`));
