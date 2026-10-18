import type { Env } from "../../db";
import type { AdminUser } from "./_middleware";

/**
 * Endpoint de verificación rápida del RBAC.
 * Solo es alcanzable si `_middleware.ts` validó una sesión con rol `admin`.
 * Responde 200 con el rol confirmado.
 */
export const onRequestGet: PagesFunction<Env, string, { adminUser?: AdminUser }> = async (
  context,
): Promise<Response> => {
  const user = context.data.adminUser;
  return new Response(
    JSON.stringify({
      success: true,
      role: user?.role ?? "admin",
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
