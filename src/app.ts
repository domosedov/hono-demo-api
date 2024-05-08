import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { timing } from "hono/timing";
import { type Session, type User } from "lucia";
import { authGuard } from "./auth/auth.guard";
import { luciaAuthMiddleware } from "./auth/lucia.middleware";
import { authRoutes } from "./routes/auth";

declare module "hono" {
  interface ContextVariableMap {
    user: User | null;
    session: Session | null;
  }
}

const app = new Hono();

app.use("*", luciaAuthMiddleware).use(logger()).use(timing());

const api = app
  .basePath("/api")
  .get("/test", (ctx) => {
    return ctx.json({ message: "Hello" });
  })
  .route("/auth", authRoutes)
  .get("/lucia/test", authGuard, (ctx) => {
    return ctx.json({ foo: "bar" });
  });

app.get("*", serveStatic({ root: "./web/dist" }));
app.get("*", serveStatic({ path: "./web/dist/index.html" }));

app.onError((err) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  throw new HTTPException(500, { message: "Internal error :(" });
});

export { app };
export type AppType = typeof api;
