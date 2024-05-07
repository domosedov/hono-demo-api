import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { serveStatic } from "hono/bun";
import { html } from "hono/html";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { timing } from "hono/timing";
import { type Session, type User } from "lucia";
import { authGuard } from "./auth/auth.guard";
import { jwtMiddleware } from "./auth/jwt.middleware";
import { verifyPassword } from "./auth/libs/password";
import { lucia } from "./auth/lucia";
import { luciaAuthMiddleware } from "./auth/lucia.middleware";
import { auth } from "./auth/routes";
import { db } from "./db/client";
import { usersTable } from "./db/schema";
import { todos } from "./todos/routes";

declare module "hono" {
  interface ContextVariableMap {
    user: User | null;
    session: Session | null;
  }
}

const app = new OpenAPIHono();

app.openAPIRegistry.registerComponent(
  "securitySchemes",
  "AuthorizationBearer",
  {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  }
);

app.post("/lucia/signup", async (ctx) => {
  const { email, password } = await ctx.req.json();

  const passwordHash = await Bun.password.hash(password);

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        email,
        password: passwordHash,
      })
      .returning();

    const session = await lucia.createSession(user!.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    ctx.header("Set-Cookie", sessionCookie.serialize(), {
      append: true,
    });

    return ctx.json(session, 201);
  } catch (e) {
    if (e instanceof Error) {
      console.log(e.message);
    }
    // db error, email taken, etc
    return new Response("Email already used", {
      status: 400,
    });
  }
});

app.post("/lucia/signin", async (ctx) => {
  const { email, password } = await ctx.req.json();

  const maybeUser = await db.query.usersTable.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (!maybeUser || !verifyPassword(password, maybeUser.password)) {
    throw new HTTPException(422, { message: "Invalid credentials" });
  }

  const session = await lucia.createSession(maybeUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  ctx.header("Set-Cookie", sessionCookie.serialize(), {
    append: true,
  });

  return ctx.json(session);
});

app
  .use("*", luciaAuthMiddleware)
  .use(logger())
  .use(timing())
  .use("/static/*", serveStatic({ root: "./" }));

app.route("/auth", auth);
app.use("/todos/*", jwtMiddleware);
app.route("/todos", todos);

app.post("/clicked", (c) => {
  return c.html(html` <div>Clicked!!!</div> `);
});

app.get("/", (c) => {
  return c.html(
    html`
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Document</title>
          <script src="https://unpkg.com/htmx.org@1.9.11"></script>
          <link rel="stylesheet" href="static/style.css" />
        </head>
        <body
          class="bg-gray-100 dark:bg-gray-800 text-black dark:text-white antialiased"
        >
          <div class="max-w-5xl mx-auto px-2">
            <h1>Typed HTMX</h1>
            <button
              class="bg-blue-500 text-white px-4 py-1.5 rounded"
              hx-post="/clicked"
              hx-swap="outerHTML"
            >
              Click Me
            </button>
            <form hx-post="/auth/credentials/signin" class="space-y-4 mt-4">
              <div class="flex flex-col gap-y-1">
                <label for="email">Email</label>
                <input type="email" name="email" />
              </div>
              <div class="flex flex-col gap-y-1">
                <label for="password">Password</label>
                <input type="password" name="password" />
              </div>
              <button type="submit">Sign in</button>
            </form>
          </div>
        </body>
      </html>
    `
  );
});

app.use("/lucia/test", authGuard).get((ctx) => {
  return ctx.json({ foo: "bar" });
});

app.get(
  "/docs",
  swaggerUI({
    url: "/openapi.json",
  })
);

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: {
    version: "1.0.0",
    title: "My API",
  },
});

app.onError((err) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  throw new HTTPException(500, { message: "Internal error :(" });
});

export default {
  port: 8080,
  fetch: app.fetch,
};
