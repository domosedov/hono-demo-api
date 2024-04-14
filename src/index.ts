import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { env } from "hono/adapter";
import { serveStatic } from "hono/bun";
import { html } from "hono/html";
import { HTTPException } from "hono/http-exception";
import { jwt } from "hono/jwt";
import { logger } from "hono/logger";
import { timing } from "hono/timing";
import { auth } from "./auth/routes";
import { todos } from "./todos/routes";

const JWT: MiddlewareHandler = (c, next) =>
  jwt({
    secret: env(c).JWT_SECRET as string,
  })(c, next);

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

app.use(logger());
app.use(timing());
app.use("/static/*", serveStatic({ root: "./" }));

app.route("/auth", auth);
app.use("/todos/*", JWT);
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
  throw new HTTPException(500, { message: "Internal error :(" });
});

export default {
  port: 8080,
  fetch: app.fetch,
};
