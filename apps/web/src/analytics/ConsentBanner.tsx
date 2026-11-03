/**
 * The one cookie banner (dl-w0b4.118, decision dl-376c8), the same as the site's
 * (apps/site/src/components/Analytics.astro). It shows only while PostHog has started and nobody on
 * this browser has answered, on jadwigo.pl or here: the answer is a .jadwigo.pl cookie. Accept turns
 * on the cookie and replay; the × is a no, which counts the visit cookieless. A child on /play never
 * sees it.
 */
import { hosts } from "@jadwigo/config";
import { copy, type Language } from "@jadwigo/copy";
import { Button, RegisterProvider } from "@jadwigo/ui";
import { X } from "lucide-react";
import type { ReactElement } from "react";
import { CATEGORY } from "../parent/adult.ts";
import { useAnalyticsConsent } from "./start.ts";

/** The site's privacy page, whose paths never move (apps/site/AGENTS.md). */
const privacyUrl = (language: Language): string =>
  `https://${hosts.prod.site}${language === "en" ? "/en/privacy" : "/prywatnosc"}`;

export function ConsentBanner({ language }: { language: Language }): ReactElement | null {
  const { status, accept, reject } = useAnalyticsConsent();
  if (status !== "pending") return null;
  const say = (key: Parameters<typeof copy>[1]) => copy(language, key, {}, CATEGORY);
  // The adult's card (handoff dl-uukj.47.67 §5, §6.10): radius 10, a 1 px line, the floating shadow.
  return (
    <RegisterProvider value="app">
      <section
        data-analytics-consent
        aria-labelledby="consent-title"
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-jw-card border border-border bg-background py-5 pr-12 pl-5 text-jw-page-body text-foreground shadow-float"
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          data-analytics-reject
          aria-label={say("consent_close")}
          onClick={reject}
          className="absolute top-2 right-2 size-9 min-h-0 min-w-0"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
        <h2 id="consent-title" className="mb-1 text-jw-page-h2 font-semibold">
          {say("consent_title")}
        </h2>
        <p>
          {say("consent_text")}{" "}
          <a
            className="text-primary underline underline-offset-3"
            href={privacyUrl(language)}
            target="_blank"
            rel="noreferrer"
          >
            {say("consent_privacy")}
          </a>
        </p>
        <Button type="button" size="lg" data-analytics-accept onClick={accept} className="mt-3">
          {say("consent_accept")}
        </Button>
      </section>
    </RegisterProvider>
  );
}
