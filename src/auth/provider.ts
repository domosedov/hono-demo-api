import type { OAuth2Provider } from "arctic";
import { GitHub, VK, Yandex } from "arctic";

export const OAUTH_PROVIDERS = {
  github: "github",
  yandex: "yandex",
  vk: "vk",
} as const;

export type OauthProvider = keyof typeof OAUTH_PROVIDERS;

export const oauthProviders = {
  github: new GitHub(
    Bun.env["GITHUB_CLIENT_ID"]!,
    Bun.env["GITHUB_CLIENT_SECRET"]!
  ),
  yandex: new Yandex(
    Bun.env["YANDEX_CLIENT_ID"]!,
    Bun.env["YANDEX_CLIENT_SECRET"]!,
    {
      redirectURI: "http://localhost/api/auth/yandex/callback",
    }
  ),
  vk: new VK(
    Bun.env["VK_APP_ID"]!,
    Bun.env["VK_SECRET_KEY"]!,
    "http://localhost/api/auth/vk/callback"
  ),
} as const satisfies Record<OauthProvider, OAuth2Provider>;

export const VK_API_VERSION = "5.199";
