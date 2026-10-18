import { createAuth } from "../../auth";
import type { Env } from "../../db";

/**
 * Guardián RBAC para todo `/api/admin/*`.
 * Verifica la sesión (cookie HttpOnly) contra Turso y exige rol `admin`.
 * Si no cumple, responde 403 inmediato y no ejecuta el endpoint hijo.
 */
export const onRequest: PagesFunction<Env, string, { adminUser?: AdminUser }> = async (
  context,
): Promise<Response> => {
  const auth = createAuth(context.env);
  const session = await auth.api.getSession({ headers: context.request.headers });

  if (!session || session.user.role !== "admin") {
    return new Response(
      JSON.stringify({
        error: "Acceso denegado: se requieren permisos de administrador.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // Pasa el usuario autenticado a los endpoints hijos.
  context.data.adminUser = session.user;
  return context.next();
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  phone?: string | null;
  loyaltyPoints?: number;
  discountPercent?: number;
  totalSpentCents?: number;
}
