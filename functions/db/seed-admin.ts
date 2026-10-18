#!/usr/bin/env -S npx tsx
/**
 * ============================================================================
 * TOYS VENEZUELA · Script de inicialización del Administrador
 * ============================================================================
 *
 * Crea (o repara) el usuario administrador inicial sobre Turso (libSQL),
 * dejando la cuenta lista para iniciar sesión con Better Auth.
 *
 * Uso:
 *   npx tsx functions/db/seed-admin.ts [email] [password] [nombre]
 *
 * Ejemplos:
 *   npx tsx functions/db/seed-admin.ts
 *   npx tsx functions/db/seed-admin.ts dueno@toysvenezuela.com "MiClaveSegura123" "Joel"
 *
 * Si no se indica contraseña, se genera una aleatoria y fuerte (se imprime una
 * sola vez en pantalla). El rol del usuario es SIEMPRE `admin`.
 *
 * Reglas:
 *  - Se ejecuta FUERA de Cloudflare (Node) usando las credenciales de `.dev.vars`.
 *  - No usa SQL concatenado: todas las escrituras pasan por Drizzle (parametrizado).
 */

import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { createDb, schema, type Env } from "./index";

/** Carga `Website/.dev.vars` (formato Cloudflare Pages) sin dependencias extra. */
function loadEnv(): Env {
  const fromFile: Record<string, string> = {};
  if (existsSync(".dev.vars")) {
    for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      fromFile[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  const env = {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? fromFile.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ?? fromFile.TURSO_AUTH_TOKEN,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? fromFile.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? fromFile.BETTER_AUTH_URL,
  } as Env;

  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    console.error("✗ Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN (revisa Website/.dev.vars).");
    exit(1);
  }
  return env;
}

/** Contraseña fuerte aleatoria (base64url sin caracteres ambiguos). */
function generatePassword(length = 20): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function main(): Promise<void> {
  const [, , argEmail, argPassword, argName] = argv;
  const email = (argEmail || "admin@toysvenezuela.com").toLowerCase().trim();
  const name = argName || "Administrador Toys Venezuela";
  const password = argPassword || generatePassword();
  const generated = !argPassword;

  const env = loadEnv();
  const db = createDb(env);
  const now = new Date();

  console.log(`→ Conectando a Turso para gestionar el administrador "${email}"...`);

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  const passwordHash = await hashPassword(password);
  let userId: string;

  if (existing.length > 0) {
    userId = existing[0].id;
    await db
      .update(schema.users)
      .set({ role: "admin", emailVerified: true, updatedAt: now })
      .where(eq(schema.users.id, userId));

    const account = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, userId))
      .limit(1);

    if (account.length > 0) {
      await db
        .update(schema.accounts)
        .set({ password: passwordHash, updatedAt: now })
        .where(eq(schema.accounts.id, account[0].id));
    } else {
      await db.insert(schema.accounts).values({
        id: randomUUID(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log("✓ El usuario ya existía: rol elevado a `admin` y contraseña actualizada.");
  } else {
    userId = randomUUID();
    await db.insert(schema.users).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "admin",
      banned: false,
      loyaltyPoints: 0,
      discountPercent: 0,
      totalSpentCents: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(schema.accounts).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    console.log("✓ Usuario administrador creado correctamente.");
  }

  console.log("");
  console.log("  ┌─────────────────────────────────────────────────────");
  console.log(`  │ Rol      : admin`);
  console.log(`  │ Email    : ${email}`);
  console.log(`  │ Nombre   : ${name}`);
  console.log(`  │ Password : ${password}${generated ? "   (generada automáticamente)" : ""}`);
  console.log("  └─────────────────────────────────────────────────────");
  if (generated) {
    console.log("  ⚠  Guarda esta contraseña ahora: no se volverá a mostrar.");
  }
  console.log("");
}

main().catch((err) => {
  console.error("✗ Error al crear el administrador:", err);
  exit(1);
});
