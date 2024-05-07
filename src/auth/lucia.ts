import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia, TimeSpan } from "lucia";
import { db } from "../db/client";
import * as schema from "../db/schema";

const luciaAuthAdapter = new DrizzleSQLiteAdapter(
  db,
  schema.sessionsTable,
  schema.usersTable
);

export const lucia = new Lucia(luciaAuthAdapter, {
  sessionExpiresIn: new TimeSpan(1, "d"),
  sessionCookie: {
    attributes: {
      secure: Bun.env.NODE_ENV === "PRODUCTION",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.email,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    UserId: number;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  email: string;
}
