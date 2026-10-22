import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";

// Una sola instancia por proceso (cada PrismaClient abre su propio pool de conexiones).
export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.databaseUrl }) });
