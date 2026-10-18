import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";

export { schema };

/**
 * Variables de entorno inyectadas por Cloudflare Pages (Functions) y por
 * `wrangler pages dev` a través de `.dev.vars`.
 */
export interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
}

/**
 * Crea un cliente libSQL (Turso) sobre HTTP para un entorno dado.
 * Se instancia por petición porque `env` solo existe dentro del handler.
 */
export function createDb(env: Env) {
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
