import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { createDb, schema, type Database, type Env } from "./db";

/**
 * Caché de la instancia de Better Auth por entorno.
 * En Cloudflare Pages cada petición recibe su propio `env`; reutilizamos la
 * instancia mientras el objeto `env` sea el mismo para evitar reconstruirla.
 */
let cache: { env: Env; auth: Auth } | null = null;

export interface Auth {
  handler: (request: Request) => Promise<Response>;
  api: ReturnType<typeof betterAuth>["api"];
}

/**
 * Construye la instancia de Better Auth con:
 * - Adaptador Drizzle + Turso (libSQL).
 * - Plugin `admin` con rol por defecto `customer` y rol administrador `admin`.
 * - Sesiones en cookies HttpOnly; SameSite=Lax; Secure (gestionadas por el servidor).
 */
export function createAuth(env: Env): Auth {
  if (cache && cache.env === env) return cache.auth;

  const db: Database = createDb(env);

  const auth = betterAuth({
    appName: "Toys Venezuela",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    // Campos públicos que el cliente SÍ puede escribir (anti-mass-assignment).
    user: {
      additionalFields: {
        phone: { type: "string", required: false, input: true },
        loyaltyPoints: { type: "number", required: false, input: false, defaultValue: 0 },
        discountPercent: { type: "number", required: false, input: false, defaultValue: 0 },
        totalSpentCents: { type: "number", required: false, input: false, defaultValue: 0 },
      },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
      },
    },
    plugins: [
      admin({
        defaultRole: "customer",
        adminRoles: ["admin"],
      }),
    ],
  });

  cache = { env, auth };
  return auth as Auth;
}
