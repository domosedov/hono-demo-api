import type { Context } from "hono";
import type { JwtPayload } from "../types";

export const getJwtPayload = ({ context }: { context: Context }) => {
  return context.get("jwtPayload") as JwtPayload;
};
