/**
 * The publish state above the draft (dl-a38n.48): the play link jw's `lesson_publish` gave, each
 * check it ran with its result, and a plain line when the draft changed after it. The page shows
 * what the file says; it never publishes, and never calls the link verified when a check failed.
 */

import { cn } from "@jadwigo/ui";
import type { ReactElement } from "react";
import type { PublishState as State } from "./model.ts";

export function PublishState({ state }: { state: State | null }): ReactElement {
  if (state === null)
    return (
      <section aria-label="Publish" className="text-muted-foreground text-sm">
        <p>Not published yet. The AI publishes locally once the check is ok.</p>
      </section>
    );
  return (
    <section
      aria-label="Publish"
      data-stale={state.stale ? "" : undefined}
      data-verified={state.verified ? "" : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 text-sm",
        state.stale || !state.verified ? "border-jw-help-edge bg-jw-help text-jw-help-ink" : "",
      )}
    >
      <p>
        <span className="font-medium">
          {state.verified ? "Published and verified" : "Published, not verified"}
        </span>{" "}
        to {state.target}
        {state.lesson_id !== null && ` as ${state.lesson_id}`}
        {state.version !== null && ` v${state.version}`}
        {state.published_at !== null && ` at ${state.published_at}`}.
      </p>
      {state.play_url !== null && (
        <p>
          Play:{" "}
          <a href={state.play_url} target="_blank" rel="noreferrer" className="underline">
            {state.play_url}
          </a>
        </p>
      )}
      {state.stale && (
        <p role="status" className="font-medium">
          Published before the last change: the link plays an older draft. Publish again to play
          this one.
        </p>
      )}
      <ul aria-label="Publish checks" className="flex flex-col gap-1">
        {state.checks.length === 0 && <li>No checks recorded.</li>}
        {state.checks.map((c) => (
          <li key={c.name} data-check={c.name} data-ok={c.ok}>
            {c.ok ? "✓" : "✗"} {c.name}
            {c.detail !== "" && ` · ${c.detail}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
