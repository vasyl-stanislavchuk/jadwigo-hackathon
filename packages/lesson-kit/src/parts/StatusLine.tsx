/**
 * Part: the step's status area (docs/17 §2f, dl-w3.41). It is there from the first frame with its
 * height kept by --kid-status-height, so a verdict changes what is inside it and never moves the
 * answer below (rule 2). Icon, words and tone come from the state table (status.ts), and its live
 * region reads the words aloud (rule 4). After a right typed answer with another accepted form, the
 * same line names it after the praise, quieter and in the same tone, so the area keeps its height
 * (dl-w3.68.1).
 */

import { copy } from "@jadwigo/copy";
import { cn, Spinner } from "@jadwigo/ui";
import type { Category, Language } from "../stage/types.ts";
import { RichText } from "./RichText.tsx";
import { alsoWords, STATUS, type StatusInput, type StepStatus, statusWords } from "./status.ts";
import { TONE_CLASS } from "./tone.ts";

export function StatusLine({
  state,
  language,
  category,
  ...input
}: StatusInput & { state: StepStatus; language: Language; category: Category }): JSX.Element {
  const row = STATUS[state];
  const words = statusWords(state, { ...input, language, category });
  const also = alsoWords({ ...input, language, category });
  const Icon = row.icon;
  return (
    <div
      data-area="status"
      className="kid-status flex min-h-[var(--kid-status-height)] items-center"
    >
      <p
        role="status"
        aria-live="polite"
        data-status={state}
        data-tone={row.tone}
        className={cn(
          "kid-feedback flex items-center gap-3 text-2xl font-semibold",
          row.tone !== "idle" && cn("rounded-xl border-2 px-3 py-1", TONE_CLASS[row.tone]),
        )}
      >
        {Icon === "spinner" ? (
          <Spinner label={copy(language, "checking")} className="size-6" />
        ) : (
          Icon !== null && <Icon aria-hidden="true" className="size-7 shrink-0" />
        )}
        {words !== null && (
          <span className={cn(Icon === "spinner" && "sr-only")}>
            {words}
            {also !== null && (
              <>
                {" "}
                <span data-also className="text-lg font-normal">
                  <RichText inline text={also} />
                </span>
              </>
            )}
          </span>
        )}
      </p>
    </div>
  );
}
