import type { MiddlewareHandler } from "hono";
import { env } from "hono/adapter";
import { jwt } from "hono/jwt";

export const jwtMiddleware: MiddlewareHandler = (c, next) =>
  jwt({
    secret: env(c).JWT_SECRET as string,
  })(c, next);
