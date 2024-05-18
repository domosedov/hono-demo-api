import { z } from "zod";

export const githubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string().nullable().optional(),
});

export type GithubUser = z.infer<typeof githubUserSchema>;

export const githubUserEmailSchema = z.object({
  email: z.string(),
  primary: z.boolean(),
  verified: z.boolean(),
  visibility: z.string().nullable(),
});

export type GithubUserEmail = z.infer<typeof githubUserEmailSchema>;

export type YandexUser = {
  id: string;
  default_email?: string;
};
