import { Hono } from "hono";

const authRoutes = new Hono().post("/signup", (ctx) => {
  return ctx.json({ message: "success" });
});

export { authRoutes };
