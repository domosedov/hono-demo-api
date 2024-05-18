import { zValidator } from "@hono/zod-validator";
import { generateState } from "arctic";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { lucia } from "../auth/lucia";
import type { OauthProvider } from "../auth/provider";
import {
  OAUTH_PROVIDERS,
  VK_API_VERSION,
  oauthProviders,
} from "../auth/provider";
import { db } from "../db/client";
import { oauthAccountsTable, usersTable } from "../db/schema";
import type { YandexUser } from "../shared/types/auth";
import { githubUserEmailSchema, githubUserSchema } from "../shared/types/auth";
import type { UnionToTuple } from "../shared/types/utils";

const OAUTH_STATE_COOKIE_KEY = "oauth_state";

const paramsSchema = z.object({
  provider: z.enum(
    Object.values(OAUTH_PROVIDERS) as UnionToTuple<OauthProvider>
  ),
});

const querySchema = z.object({
  code: z.string(),
  state: z.string(),
});

const cookieSchema = z.object({
  [OAUTH_STATE_COOKIE_KEY]: z.string(),
});

export const oauthRoutes = new Hono()
  .get("/:provider", zValidator("param", paramsSchema), async (ctx) => {
    const { provider } = ctx.req.valid("param");
    const state = generateState();

    let url: URL;

    switch (provider) {
      case "github": {
        url = await oauthProviders["github"].createAuthorizationURL(state, {
          scopes: ["read:user", "user:email"],
        });
        break;
      }
      case "yandex": {
        url = await oauthProviders["yandex"].createAuthorizationURL(state);
        break;
      }
      case "vk": {
        url = await oauthProviders["vk"].createAuthorizationURL(state, {
          scopes: ["email"],
        });
        url.searchParams.append("v", VK_API_VERSION);
        break;
      }
    }

    setCookie(ctx, OAUTH_STATE_COOKIE_KEY, state, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "Lax",
    });

    return ctx.redirect(url.toString());
  })
  .get(
    "/:provider/callback",
    zValidator("param", paramsSchema),
    zValidator("query", querySchema),
    zValidator("cookie", cookieSchema),
    async (ctx) => {
      const { provider } = ctx.req.valid("param");
      const { code, state } = ctx.req.valid("query");
      const { oauth_state } = ctx.req.valid("cookie");

      let userId: number;

      if (state !== oauth_state) {
        deleteCookie(ctx, OAUTH_STATE_COOKIE_KEY);
        throw new HTTPException(400, {
          message: "Bad request",
          res: Response.json({ message: "Bad request" }, { status: 400 }),
        });
      }

      let providerUserId: string;
      let providerUserEmail: string | undefined;

      switch (provider) {
        case "github": {
          const tokens = await oauthProviders[
            "github"
          ].validateAuthorizationCode(code);

          const [githubUser, githubEmails] = await Promise.all([
            fetch("https://api.github.com/user", {
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            })
              .then((res) => res.json())
              .then((data) => githubUserSchema.parse(data)),
            fetch("https://api.github.com/user/emails", {
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            })
              .then((res) => res.json())
              .then((data) => githubUserEmailSchema.array().parse(data)),
          ]);

          providerUserId = githubUser.id.toString();
          providerUserEmail = githubEmails.find(
            (email) => email.primary
          )?.email;

          break;
        }
        case "vk": {
          const tokens = await oauthProviders["vk"].validateAuthorizationCode(
            code
          );

          providerUserId = tokens.userId;
          providerUserEmail = tokens.email!;

          break;
        }
        case "yandex": {
          const tokens = await oauthProviders[
            "yandex"
          ].validateAuthorizationCode(code);

          const response = await fetch(
            "https://login.yandex.ru/info?format=json",
            {
              headers: {
                Authorization: `OAuth ${tokens.accessToken}`,
              },
            }
          );
          const user: YandexUser = await response.json();

          providerUserId = user.id;
          providerUserEmail = user.default_email;

          break;
        }
      }

      const maybeOauthAccount = await db.query.oauthAccountsTable.findFirst({
        where: (account, { and, eq }) =>
          and(
            eq(account.providerId, provider),
            eq(account.providerUserId, providerUserId)
          ),
      });

      if (maybeOauthAccount) {
        userId = maybeOauthAccount.userId;
      } else {
        if (!providerUserEmail) {
          throw new HTTPException(400, {
            message: "Bad request",
            res: Response.json(
              { message: "No email provided" },
              { status: 400 }
            ),
          });
        }

        userId = await db.transaction(async (tx) => {
          const maybeUser = await tx.query.usersTable.findFirst({
            where: (user, { eq }) => eq(user.email, providerUserEmail),
          });

          if (maybeUser) {
            const user = maybeUser;

            await tx.insert(oauthAccountsTable).values({
              userId: user.id,
              providerId: provider,
              providerUserId: providerUserId,
            });

            return user.id;
          } else {
            const [newUser] = await tx
              .insert(usersTable)
              .values({
                email: providerUserEmail,
              })
              .returning();

            await tx.insert(oauthAccountsTable).values({
              userId: newUser!.id,
              providerId: OAUTH_PROVIDERS.github,
              providerUserId,
            });

            return newUser!.id;
          }
        });
      }

      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      ctx.header("Set-Cookie", sessionCookie.serialize(), {
        append: true,
      });

      return ctx.redirect("http://localhost:5173");
    }
  );
