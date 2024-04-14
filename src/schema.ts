import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./db/schema";

const _usersInsertSchema = createInsertSchema(usersTable);

export const userCredentialsSchema = _usersInsertSchema.pick({
  email: true,
  password: true,
});

const _usersSelectSchema = createSelectSchema(usersTable, {
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
});

export const userSelectSchema = _usersSelectSchema.omit({ password: true });
