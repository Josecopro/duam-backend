// Servidor local (en Vercel se usa directamente el export de app.ts).
import app from "./app.js";
import { env } from "./infrastructure/config/env.js";

app.listen(env.port, () => console.log(`API de DUAM en http://localhost:${env.port}`));
