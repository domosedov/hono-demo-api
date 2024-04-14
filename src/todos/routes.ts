import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getJwtPayload } from "../auth/libs/get_jwt_payload";
import { db } from "../db/client";
import { todosTable } from "../db/schema";
import { todoCreateSchema, todoSchema } from "./schema";

const todos = new OpenAPIHono();

todos.openapi(
  createRoute({
    path: "/",
    method: "get",
    tags: ["Todos"],
    security: [{ AuthorizationBearer: [] }],
    responses: {
      200: {
        description: "Get all user todos",
        content: {
          "application/json": {
            schema: z.array(todoSchema),
          },
        },
      },
    },
  }),
  async (ctx) => {
    const { sub } = getJwtPayload({ context: ctx });
    const todos = await db.query.todosTable.findMany({
      where: (todo, { eq }) => eq(todo.userId, sub),
    });
    return ctx.json(todos);
  }
);

todos.openapi(
  createRoute({
    path: "/",
    method: "post",
    tags: ["Todos"],
    security: [{ AuthorizationBearer: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: todoCreateSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Create todo",
        content: {
          "application/json": {
            schema: todoSchema,
          },
        },
      },
    },
  }),
  async (ctx) => {
    const { sub } = getJwtPayload({ context: ctx });
    const value = ctx.req.valid("json");
    const [todo] = await db
      .insert(todosTable)
      .values({ ...value, userId: sub })
      .returning();
    return ctx.json(todo!, 201);
  }
);

export { todos };
