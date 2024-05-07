import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { lucia } from "./lucia";

export const authGuard: MiddlewareHandler = (ctx, next) => {
  const session = ctx.get("session");

  if (!session) {
    const headers = new Headers();

    headers.append("Set-Cookie", lucia.createBlankSessionCookie().serialize());

    throw new HTTPException(401, {
      res: Response.json(
        { message: "unauthorized" },
        {
          status: 401,
          headers,
        }
      ),
    });
  }

  return next();
};
