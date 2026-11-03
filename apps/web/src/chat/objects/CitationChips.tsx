/**
 * "Dlaczego?" (dl-uukj.47.62): under Jadwigo AI's message, what its claims rest on, as quiet chips
 * that open each thing beside the chat (objects/ref.ts, dl-uukj.47.58). PostHog's evidence chips
 * (`docs/research/chat-objects.md` section 2), and the quiet "dlaczego?" of
 * `docs/research/posthog-ai-ux-patterns.md` section 15.4.
 *
 * A chip names its kind in the parent's words, numbered when a message cites several of one kind,
 * and never shows an id, a level or a score. A goal has no object kind yet and its citation names no
 * learner, so it gets no chip until one does (noted on dl-uukj.47.62).
 */

import type { Citation } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ReactElement } from "react";
import { type ObjectRef, objectRef, sameObject } from "./ref.ts";
import { objectEntry } from "./registry.tsx";

/** The thing a citation opens, or null for one with no object kind (a goal) or a malformed id. */
function refOf(citation: Citation): ObjectRef | null {
  switch (citation.kind) {
    case "attempt":
      return objectRef("attempt", citation.attempt_id);
    case "skill":
      return objectRef("skill", citation.skill_code);
    case "goal":
      return null;
  }
}

/** Each citation's thing once, in the order the message cites them. */
export function citedObjects(citations: readonly Citation[]): ObjectRef[] {
  const refs: ObjectRef[] = [];
  for (const citation of citations) {
    const ref = refOf(citation);
    if (ref !== null && !refs.some((r) => sameObject(r, ref))) refs.push(ref);
  }
  return refs;
}

export function CitationChips({
  citations,
  language,
  onOpen,
}: {
  citations: readonly Citation[];
  language: Language;
  onOpen: (object: ObjectRef) => void;
}): ReactElement | null {
  const refs = citedObjects(citations);
  if (refs.length === 0) return null;
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const seen = new Map<string, number>();
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1" data-citations>
      <span className="text-jw-page-small text-jw-ink-soft">{say("chat_citations_why")}</span>
      <ul aria-label={say("chat_citations")} className="flex flex-wrap gap-1.5">
        {refs.map((ref) => {
          const entry = objectEntry(ref.kind);
          const Icon = entry.icon;
          const many = refs.filter((r) => r.kind === ref.kind).length > 1;
          const n = (seen.get(ref.kind) ?? 0) + 1;
          seen.set(ref.kind, n);
          const title = say(entry.title);
          const label = many ? say("chat_citation_nth", { title, n }) : title;
          return (
            <li key={`${ref.kind}:${ref.id}`}>
              <button
                type="button"
                onClick={() => onOpen(ref)}
                className="flex min-h-jw-control-sm items-center gap-1 rounded-jw-small border-jw border-border px-2 text-jw-page-small font-medium text-foreground transition-colors duration-jw-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                data-citation={ref.kind}
              >
                <Icon aria-hidden className="size-3.5 text-jw-ink-soft" />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
