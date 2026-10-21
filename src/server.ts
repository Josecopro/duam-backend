// Servidor local (en Vercel se usa directamente el export de app.ts).
import app from "./app.js";

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API de DUAM en http://localhost:${port}`));
