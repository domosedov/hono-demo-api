import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { env } from "hono/adapter";
import { deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { omit } from "remeda";
import { db } from "../db/client";
import { usersTable } from "../db/schema";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./constants";
import generateTokens from "./libs/generate_tokens";
import { hashPassword, verifyPassword } from "./libs/password";
import { setTokensCookie } from "./libs/set_tokens_cookie";
import { tokensSchema, userCredentialsSchema } from "./schema";

const credentials = new OpenAPIHono();

credentials.openapi(
  createRoute({
    path: "/signup",
    method: "post",
    tags: ["Auth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: userCredentialsSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Create user",
        content: {
          "application/json": {
            schema: tokensSchema,
          },
        },
      },
      409: {
        description: "Conflict error",
        content: {
          "application/json": {
            schema: z.object({ message: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { email, password } = c.req.valid("json");

    const maybeUser = await db.query.usersTable.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    if (maybeUser) {
      throw new HTTPException(409, { message: "User already exists" });
    }

    const [newUser] = await db
      .insert(usersTable)
      .values({ email, password: await hashPassword(password) })
      .returning();

    const payload = omit(newUser!, ["password"]);

    const { access_token, refresh_token } = await generateTokens({
      sub: payload.id,
      secret: env(c).JWT_SECRET as string,
    });

    setTokensCookie({ context: c, access_token, refresh_token });

    return c.json({ ...payload, access_token, refresh_token }, 201);
  }
);

credentials.openapi(
  createRoute({
    path: "/signin",
    method: "post",
    tags: ["Auth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: userCredentialsSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Sign in",
        content: {
          "application/json": {
            schema: tokensSchema,
          },
        },
      },
      422: {
        description: "Invalid credentials error",
        content: {
          "application/json": {
            schema: z.object({ message: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { email, password } = c.req.valid("json");

    const maybeUser = await db.query.usersTable.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    if (!maybeUser) {
      throw new HTTPException(422, { message: "Invalid credentials" });
    }

    if (!(await verifyPassword(password, maybeUser.password))) {
      throw new HTTPException(422, { message: "Invalid credentials" });
    }

    const user = omit(maybeUser, ["password"]);

    const { access_token, refresh_token } = await generateTokens({
      sub: user.id,
      secret: env(c).JWT_SECRET as string,
    });

    setTokensCookie({ context: c, access_token, refresh_token });

    return c.json({ access_token, refresh_token }, 200);
  }
);

credentials.openapi(
  createRoute({
    path: "/signout",
    method: "post",
    tags: ["Auth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: tokensSchema.pick({ refresh_token: true }).partial(),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Sign out",
        content: {
          "application/json": {
            schema: z.object({ message: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    deleteCookie(c, ACCESS_TOKEN_KEY);
    deleteCookie(c, REFRESH_TOKEN_KEY);

    return c.json({ message: "ok" });
  }
);

credentials.openapi(
  createRoute({
    path: "/refresh",
    method: "post",
    tags: ["Auth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: tokensSchema.pick({ refresh_token: true }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Create user",
        content: {
          "application/json": {
            schema: tokensSchema,
          },
        },
      },
      401: {
        description: "Invalid refresh token",
        content: {
          "application/json": {
            schema: z.object({ message: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { refresh_token: token } = c.req.valid("json");

    const { sub } = await verify(token, env(c).JWT_SECRET as string);

    const maybeUser = await db.query.usersTable.findFirst({
      where: (user, { eq }) => eq(user.id, sub),
    });

    if (!maybeUser) {
      throw new HTTPException(401, { message: "Invalid refresh token" });
    }

    const { access_token, refresh_token } = await generateTokens({
      sub: maybeUser.id,
      secret: env(c).JWT_SECRET as string,
    });

    setTokensCookie({ context: c, access_token, refresh_token });

    return c.json({ access_token, refresh_token });
  }
);

const auth = new OpenAPIHono();

auth.route("/credentials", credentials);

export { auth };
