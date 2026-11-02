/**
 * The analytics consent banner on the parent screens (dl-uukj.56, decision dl-376c8). It shows only
 * while PostHog has started and the parent has not answered. A child on /play never sees it.
 */
import { hosts } from "@jadwigo/config";
import { copy, type Language } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
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
  return (
    <section
      data-analytics-consent
      aria-label={say("parent_analytics_privacy")}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-lg border bg-background p-4 shadow-lg"
    >
      <p>
        {say("parent_analytics_ask")}{" "}
        <a className="underline" href={privacyUrl(language)} target="_blank" rel="noreferrer">
          {say("parent_analytics_privacy")}
        </a>
      </p>
      <div className="flex gap-2">
        <Button type="button" size="control" data-analytics-accept onClick={accept}>
          {say("parent_analytics_accept")}
        </Button>
        <Button
          type="button"
          size="control"
          variant="outline"
          data-analytics-reject
          onClick={reject}
        >
          {say("parent_analytics_reject")}
        </Button>
      </div>
    </section>
  );
}
