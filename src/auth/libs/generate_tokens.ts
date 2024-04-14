import { sign } from "hono/jwt";

export default async function generateTokens({
  sub,
  secret,
  payload = {},
}: {
  sub: number | string;
  secret: string;
  payload?: Record<string, unknown>;
}) {
  const access_token = await sign(
    {
      sub,
      exp: Math.floor(Date.now() / 1_000 + 60 * 15), // 15min
      iat: Math.floor(Date.now() / 1_000),
      ...payload,
    },
    secret
  );

  const refresh_token = await sign(
    {
      sub,
      exp: Math.floor(Date.now() / 1_000 + 60 * 60 * 24 * 7), // 7d
      iat: Math.floor(Date.now() / 1_000),
      ...payload,
    },
    secret
  );

  return { access_token, refresh_token };
}
