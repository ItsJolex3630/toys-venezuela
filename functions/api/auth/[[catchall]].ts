import { createAuth } from "../../auth";
import type { Env } from "../../db";

/**
 * Handler de Cloudflare Pages Functions para Better Auth.
 * Captura todas las rutas bajo `/api/auth/*` y delega en `auth.handler`.
 */
export const onRequest = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const auth = createAuth(context.env);
  return auth.handler(context.request);
};
