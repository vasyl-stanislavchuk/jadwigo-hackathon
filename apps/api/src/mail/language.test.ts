import type { AuthEmailHook } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { pickLanguage } from "./language.ts";

function hook(
  language: unknown,
  redirect_to: string | undefined,
  site_url: string | undefined,
): AuthEmailHook {
  return {
    user: {
      email: "parent@example.com",
      ...(language === undefined ? {} : { user_metadata: { language } }),
    },
    email_data: {
      token: "123456",
      email_action_type: "magiclink",
      ...(redirect_to === undefined ? {} : { redirect_to }),
      ...(site_url === undefined ? {} : { site_url }),
    },
  };
}

describe("pickLanguage: the metadata, then the host, then Polish", () => {
  it.each([
    ["the metadata's en wins over a .pl host", "en", "https://app.jadwigo.pl/parent", "pl", "en"],
    ["the metadata's pl wins over a .kids host", "pl", "https://app.jadwigo.kids/", "en", "pl"],
    ["an upper-case metadata tag counts", " PL ", "https://app.jadwigo.kids/", "en", "pl"],
    ["en-GB in the metadata is English", "en-GB", "https://app.jadwigo.pl/", "pl", "en"],
    [
      "a trailing-dot .kids host is English",
      undefined,
      "https://app.jadwigo.kids./parent",
      "pl",
      "en",
    ],
    [
      "no metadata: a .kids redirect is English",
      undefined,
      "https://app.jadwigo.kids/",
      "pl",
      "en",
    ],
    ["no metadata: a .pl redirect is Polish", undefined, "https://app.jadwigo.pl/", "en", "pl"],
    [
      "a metadata language we do not speak is ignored",
      "de",
      "https://app.jadwigo.kids/",
      "pl",
      "en",
    ],
    ["metadata that is not a string is ignored", 7, undefined, "en", "en"],
    [
      "a local redirect falls through to the site's host",
      undefined,
      "http://127.0.0.1:5173/parent",
      "en",
      "en",
    ],
    ["a redirect that is not a URL falls through", undefined, "not a url", "en", "en"],
    ["no hint at all is Polish", undefined, undefined, undefined, "pl"],
    ["only local hosts is Polish", undefined, "http://localhost:5173/", "local", "pl"],
  ])("%s", (_, language, redirect, site, want) => {
    const siteUrl =
      site === "pl"
        ? "https://app.jadwigo.pl"
        : site === "en"
          ? "https://app.jadwigo.kids"
          : site === "local"
            ? "http://127.0.0.1:5173"
            : undefined;
    expect(pickLanguage(hook(language, redirect, siteUrl))).toBe(want);
  });
});
