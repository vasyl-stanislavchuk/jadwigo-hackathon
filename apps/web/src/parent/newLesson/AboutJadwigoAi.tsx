/**
 * The one muted line under the first screen's box (dl-uukj.47.37; owner, 2026-11-02: handoff §5.1's
 * "nothing else" is amended by this line): "Jadwigo AI ułoży lekcję z Twojego opisu. Zobacz, jak to
 * działa", the second sentence a button. It opens a small dialog (440, as Dodaj dziecko) titled
 * "Co robi Jadwigo AI" with its 4 lines and a link to the site's page about it. Esc closes it, and
 * the focus comes back to the button. No starters, no second line. Jadwigo AI's lines are neutral:
 * no person, no gender.
 */

import { hosts } from "@jadwigo/config";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Link,
  linkVariants,
} from "@jadwigo/ui";
import { type ReactElement, useRef, useState } from "react";
import { CATEGORY } from "../adult.ts";

const STEPS = [
  "parent_ai_about_reads",
  "parent_ai_about_searches",
  "parent_ai_about_builds",
  "parent_ai_about_you",
] as const satisfies readonly CopyKey[];

/** The site's page about Jadwigo AI, in the page's language: /jadwigo-ai, or /en/jadwigo-ai. */
const aboutUrl = (language: Language): string =>
  `https://${hosts.prod.site}${language === "en" ? "/en" : ""}/jadwigo-ai`;

export function AboutJadwigoAi({ language }: { language: Language }): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [open, setOpen] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  return (
    <>
      <p
        className="flex flex-wrap justify-center gap-x-1 text-center text-jw-page-small text-jw-ink-soft"
        data-ai-intro
      >
        <span>{t("parent_ai_intro")}</span>
        <button
          ref={more}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={linkVariants({ size: "small" })}
          data-ai-intro-more
        >
          {t("parent_ai_intro_more")}
        </button>
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={t("parent_ai_about_title")}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            more.current?.focus();
          }}
          data-ai-about
        >
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            {STEPS.map((key) => (
              <li key={key} data-ai-step={key}>
                {t(key)}
              </li>
            ))}
          </ol>
          <Link href={aboutUrl(language)} target="_blank" rel="noopener" size="small">
            {t("parent_ai_about_link")}
          </Link>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="control">
                {t("close")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
