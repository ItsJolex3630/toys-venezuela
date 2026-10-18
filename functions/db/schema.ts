import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 1. Tabla de Usuarios
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  image: text("image"),
  phone: text("phone"),

  // --- CAMPOS PROTEGIDOS POR EL SERVIDOR (RBAC & Fidelización) ---
  role: text("role", { enum: ["customer", "vip", "admin"] })
    .notNull()
    .default("customer"), // Todo registro nace como customer
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp" }),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  discountPercent: integer("discount_percent").notNull().default(0),
  totalSpentCents: integer("total_spent_cents").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// 2. Tabla de Sesiones (Cookies HttpOnly)
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: text("impersonated_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// 3. Tabla de Cuentas / Credenciales (Hashing seguro)
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"), // Hash con Argon2 / Scrypt
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// 4. Verificaciones (Tokens de recuperación o verificación)
export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// 5. Historial de Puntos / Fidelización (Libro Contable Auditable)
export const loyaltyTransactions = sqliteTable("loyalty_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pointsDelta: integer("points_delta").notNull(), // Positivo (ganados) o Negativo (canjeados)
  reason: text("reason").notNull(), // Ej: "Compra orden #102", "Bono de bienvenida"
  orderId: text("order_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
