/**
 * env.ts — side-effect module that loads .env.local then .env into process.env.
 *
 * Import this FIRST in every eval script (`import "./env";`), before any import
 * that reaches @/lib/prisma or @/lib/openai. ES modules evaluate imports in
 * source order, so loading env here guarantees DATABASE_URL / OPENAI_API_KEY are
 * present by the time the Prisma client and OpenAI client are constructed.
 */
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
