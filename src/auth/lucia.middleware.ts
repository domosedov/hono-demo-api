import type { MiddlewareHandler } from "hono";
import { lucia } from "./lucia";

export const luciaAuthMiddleware: MiddlewareHandler = async (ctx, next) => {
  const sessionId =
    lucia.readBearerToken(ctx.req.header("Authorization") ?? "") ??
    lucia.readSessionCookie(ctx.req.header("Cookie") ?? "");

  if (!sessionId) {
    ctx.set("user", null);
    ctx.set("session", null);
    return next();
  }
  const { session, user } = await lucia.validateSession(sessionId);

  if (session && session.fresh) {
    ctx.header(
      "Set-Cookie",
      lucia.createSessionCookie(session.id).serialize(),
      {
        append: true,
      }
    );
  }
  if (!session) {
    ctx.header("Set-Cookie", lucia.createBlankSessionCookie().serialize(), {
      append: true,
    });
  }
  ctx.set("user", user);
  ctx.set("session", session);
  return next();
};
