import { GitHub } from "arctic";

export const githubProvider = new GitHub(
  Bun.env["GITHUB_CLIENT_ID"]!,
  Bun.env["GITHUB_CLIENT_SECRET"]!
);

export const GITHUB_PROVIDER_ID = "github";
