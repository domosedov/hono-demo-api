import type { Context } from "hono";
import { env } from "hono/adapter";
import { setCookie } from "hono/cookie";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../constants";

export function setTokensCookie({
  context,
  access_token,
  refresh_token,
}: {
  context: Context;
  access_token: string;
  refresh_token: string;
}) {
  setCookie(context, ACCESS_TOKEN_KEY, access_token, {
    path: "/",
    httpOnly: false,
    expires: new Date(Date.now() + 1_000 * 60 * 15),
    maxAge: 60 * 15,
    secure: env(context)?.NODE_ENV === "production",
  });

  setCookie(context, REFRESH_TOKEN_KEY, refresh_token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1_000 * 60 * 60 * 24 * 7),
    maxAge: 60 * 60 * 24 * 7,
    secure: env(context)?.NODE_ENV === "production",
  });
}
