import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const todosTable = sqliteTable("todos", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const oauthAccountsTable = sqliteTable(
  "oauth_accounts",
  {
    providerId: text("provider_id").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    userId: integer("user_id", { mode: "number" })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.providerId, table.providerUserId] }),
    };
  }
);

export const sessionsTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});
