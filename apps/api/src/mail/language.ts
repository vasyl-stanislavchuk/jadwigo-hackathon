import { type AuthEmailHook, Language } from "@jadwigo/contracts";

/**
 * The language of an auth mail (dl-liwi.33, docs/research/i18n.md section 2, "Auth mail: the
 * account's language, then the host"):
 *
 * 1. the `language` the page put in the user's metadata at sign-up (`signInWithOtp` `options.data`)
 * 2. else the host of `redirect_to`, then of `site_url`: a `.kids` host is English, a `.pl` host Polish
 * 3. else Polish, the default a new parent gets (dl-liwi.32)
 */
export function pickLanguage(hook: AuthEmailHook): Language {
  const chosen = Language.safeParse(hook.user.user_metadata?.language);
  if (chosen.success) return chosen.data;
  for (const url of [hook.email_data.redirect_to, hook.email_data.site_url]) {
    const host = hostOf(url);
    if (host?.endsWith(".kids")) return "en";
    if (host?.endsWith(".pl")) return "pl";
  }
  return "pl";
}

function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}
