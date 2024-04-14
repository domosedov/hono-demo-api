import { z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { todosTable } from "../db/schema";

export const todoSchema = createSelectSchema(todosTable, {
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
}).openapi("Todo");

export const todoInsertSchema = createInsertSchema(todosTable, {
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
});

export const todoCreateSchema = todoInsertSchema
  .pick({ title: true, description: true })
  .openapi("TodoCreate");
