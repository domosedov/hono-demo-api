import { z } from "@hono/zod-openapi";

export const tokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});
