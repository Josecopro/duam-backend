import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../../application/ports.js";

const COST = 10;

export const bcryptHasher: PasswordHasher = {
  hash: (plain) => bcrypt.hash(plain, COST),
  compare: (plain, hash) => bcrypt.compare(plain, hash),
};
