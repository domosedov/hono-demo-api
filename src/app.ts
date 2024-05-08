import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { timing } from "hono/timing";
import { type Session, type User } from "lucia";
import { z } from "zod";
import { authGuard } from "./auth/auth.guard";
import { verifyPassword } from "./auth/libs/password";
import { lucia } from "./auth/lucia";
import { luciaAuthMiddleware } from "./auth/lucia.middleware";
import { db } from "./db/client";
import { usersTable } from "./db/schema";
import { authRoutes } from "./routes/auth";

declare module "hono" {
  interface ContextVariableMap {
    user: User | null;
    session: Session | null;
  }
}

const app = new Hono();

app.use("*", luciaAuthMiddleware).use(logger()).use(timing());

const signupBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const signupQuerySchema = z
  .object({
    code: z.string().optional(),
  })
  .optional();

const api = app
  .basePath("/api")
  .get("/test", (ctx) => {
    return ctx.json({ message: "Hello" });
  })
  .route("/auth", authRoutes)
  .post("/lucia/signup", async (ctx) => {
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
  })
  .post(
    "/lucia/signin",
    zValidator("json", signupBodySchema),
    zValidator("query", signupQuerySchema),
    async (ctx) => {
      const { email, password } = ctx.req.valid("json");
      const query = ctx.req.valid("query");

      console.log({ code: query?.code });

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
    }
  )
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
