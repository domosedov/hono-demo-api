import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { isNonNullish, pickBy } from "remeda";
import { getJwtPayload } from "../auth/libs/get_jwt_payload";
import { db } from "../db/client";
import { todosTable } from "../db/schema";
import { todoCreateSchema, todoSchema, todoUpdateSchema } from "./schema";

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
    const { title, description = null } = ctx.req.valid("json");
    const [todo] = await db
      .insert(todosTable)
      .values({ title, description, userId: sub })
      .returning();
    return ctx.json(todo!, 201);
  }
);

todos.openapi(
  createRoute({
    path: "/{id}",
    method: "get",
    tags: ["Todos"],
    security: [{ AuthorizationBearer: [] }],
    request: {
      params: z.object({
        id: z.coerce.number(),
      }),
    },
    responses: {
      200: {
        description: "Get todo by ID",
        content: {
          "application/json": {
            schema: todoSchema,
          },
        },
      },
      404: {
        description: "Todo not found",
      },
    },
  }),
  async (ctx) => {
    const { sub } = getJwtPayload({ context: ctx });
    const { id } = ctx.req.valid("param");
    const todo = await db.query.todosTable.findFirst({
      where: (todo, { eq, and }) => and(eq(todo.id, id), eq(todo.userId, sub)),
    });

    if (!todo) {
      throw new HTTPException(404);
    }

    return ctx.json(todo);
  }
);

todos.openapi(
  createRoute({
    path: "/{id}",
    method: "patch",
    tags: ["Todos"],
    security: [{ AuthorizationBearer: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: todoUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Update todo",
        content: {
          "application/json": {
            schema: todoSchema,
          },
        },
      },
      404: {
        description: "Not found",
      },
    },
  }),
  async (ctx) => {
    const { sub } = getJwtPayload({ context: ctx });
    const { id } = ctx.req.valid("param");

    const values = pickBy(ctx.req.valid("json"), isNonNullish) as object;

    const maybeTodo = await db.query.todosTable.findFirst({
      where: (todo, { and, eq }) => and(eq(todo.id, +id), eq(todo.userId, sub)),
    });

    if (!maybeTodo) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const [todo] = await db
      .update(todosTable)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(todosTable.id, +id), eq(todosTable.userId, sub)))
      .returning();

    return ctx.json(todo!);
  }
);

todos.openapi(
  createRoute({
    path: "/{id}",
    method: "delete",
    tags: ["Todos"],
    security: [{ AuthorizationBearer: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Delete todo",
        content: {
          "application/json": {
            schema: todoSchema,
          },
        },
      },
      404: {
        description: "Not found",
      },
    },
  }),
  async (ctx) => {
    const { sub } = getJwtPayload({ context: ctx });
    const { id } = ctx.req.valid("param");

    const maybeTodo = await db.query.todosTable.findFirst({
      where: (todo, { and, eq }) => and(eq(todo.id, +id), eq(todo.userId, sub)),
    });

    if (!maybeTodo) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const [todo] = await db
      .delete(todosTable)
      .where(and(eq(todosTable.id, +id), eq(todosTable.userId, sub)))
      .returning();

    return ctx.json(todo!);
  }
);

export { todos };
