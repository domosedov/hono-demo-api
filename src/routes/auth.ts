import { generateState } from "arctic";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { lucia } from "../auth/lucia";
import { GITHUB_PROVIDER_ID, githubProvider } from "../auth/provider";
import { db } from "../db/client";
import { oauthAccountsTable, usersTable } from "../db/schema";
import { githubUserEmailSchema, githubUserSchema } from "../shared/types/auth";

const authRoutes = new Hono()
  .post("/signup", (ctx) => {
    return ctx.json({ message: "success" });
  })
  .get("/github", async (ctx) => {
    const state = generateState();
    const url = await githubProvider.createAuthorizationURL(state, {
      scopes: ["read:user", "user:email"],
    });

    setCookie(ctx, "github_oauth_state", state, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10,
      sameSite: "Lax",
    });

    return ctx.redirect(url.toString());
  })
  .get("/github/callback", async (ctx) => {
    const { code, state } = ctx.req.query();
    const { github_oauth_state } = getCookie(ctx);

    if (
      !code ||
      !state ||
      !github_oauth_state ||
      state !== github_oauth_state
    ) {
      deleteCookie(ctx, "github_oauth_state");
      throw new HTTPException(400, {
        message: "Bad request",
        res: Response.json({ message: "Bad request" }, { status: 400 }),
      });
    }

    const tokens = await githubProvider.validateAuthorizationCode(code);

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

    const maybeOauthAccount = await db.query.oauthAccountsTable.findFirst({
      where: (account, { and, eq }) =>
        and(
          eq(account.providerId, GITHUB_PROVIDER_ID),
          eq(account.providerUserId, githubUser.id.toString())
        ),
    });

    let userId: number;

    if (maybeOauthAccount) {
      userId = maybeOauthAccount.userId;
    } else {
      const primaryEmail = githubEmails.find((email) => email.primary)?.email;

      if (!primaryEmail) {
        throw new HTTPException(400, {
          message: "Bad request",
          res: Response.json({ message: "No email provided" }, { status: 400 }),
        });
      }

      userId = await db.transaction(async (tx) => {
        const maybeUser = await tx.query.usersTable.findFirst({
          where: (user, { eq }) => eq(user.email, primaryEmail),
        });

        if (maybeUser) {
          const user = maybeUser;

          await tx.insert(oauthAccountsTable).values({
            userId: user.id,
            providerId: GITHUB_PROVIDER_ID,
            providerUserId: githubUser.id.toString(),
          });

          return user.id;
        } else {
          const [newUser] = await tx
            .insert(usersTable)
            .values({
              email: primaryEmail,
            })
            .returning();

          await tx.insert(oauthAccountsTable).values({
            userId: newUser!.id,
            providerId: GITHUB_PROVIDER_ID,
            providerUserId: githubUser.id.toString(),
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

    return ctx.redirect("/");
  });

export { authRoutes };
