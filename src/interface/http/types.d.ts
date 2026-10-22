import type { AuthPayload } from "../../application/ports.js";

declare global {
  namespace Express {
    interface Request {
      /** Lo deja el middleware `authenticate`. */
      user?: AuthPayload;
    }
  }
}

export {};
