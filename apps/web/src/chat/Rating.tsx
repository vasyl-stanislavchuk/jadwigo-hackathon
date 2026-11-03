/**
 * Good, Bad and Try again on a completed turn (dl-z5ja.63, research §15.6, dl-xo0q's band): "Jak
 * poszło? Dobrze · Słabo · Spróbuj jeszcze raz". The handoff's "Źle" is a word the copy never uses
 * bare (copy.test.ts), so Bad reads "Słabo" ("Not great" in English). Bad asks what was missing, a note the parent may
 * leave empty. The rating goes to `POST /api/v1/runs/{id}/ratings` with the turn's run id (wave 4
 * lead decision 37), never to an analytics event, since a note may hold learner data. Try again is
 * no route: the page sends the turn's own message again as a new turn.
 *
 * On the adult kit (dl-uukj.47.67 S11, §6.9): Dobrze and Słabo are a labelled toggle group, each
 * choice its icon and its word, so no icon stands alone; Spróbuj jeszcze raz is a quiet button with
 * its word beside them, an action rather than a choice. The route holds two verdicts, good and bad,
 * so the group has two (the handoff's three, Za łatwa · W sam raz · Za trudna, wait on a contract
 * change, dl-uukj.47.67.10's follow-up). "Jak poszło?" names the group. Słabo opens the note.
 *
 * Drawn as the chat handoff's rating row (dl-uukj.47.71 S8, s15): the label in muted words, the 2
 * values as words on one stone track (no icons), the pick in the picked fill, and Spróbuj jeszcze
 * raz at the row's end. The 3 values wait on dl-uukj.47.67.21 (owner, 2026-11-03).
 */

import { track } from "@jadwigo/analytics";
import type { RunId, RunRatingCreate } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Textarea, ToggleGroup, ToggleGroupItem } from "@jadwigo/ui";
import { RotateCcwIcon } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import { useId, useState } from "react";

/** One value on the track: the small radius (4), no edge until picked (handoff §11). */
const SEGMENT =
  "min-h-7 rounded-jw-small border-transparent bg-transparent px-2.5 text-jw-page-small hover:bg-jw-card";

type State = "asking" | "missing" | "saving" | "saved" | "failed";

export function Rating({
  language,
  run,
  onRate,
  onRetry,
}: {
  language: Language;
  /** The turn's run: every rating carries it. */
  run: RunId;
  onRate(run: RunId, body: RunRatingCreate): Promise<unknown>;
  /** Sends the turn's message again; absent when the turn holds none. */
  onRetry?: (() => void) | undefined;
}): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  const [state, setState] = useState<State>("asking");
  const [note, setNote] = useState("");
  const noteId = useId();
  const labelId = useId();
  const rate = (body: RunRatingCreate) => {
    setState("saving");
    onRate(run, body).then(
      () => {
        // The verdict only: a note may hold learner data (contracts RunRating).
        track("chat_response_rated", { verdict: body.verdict });
        setState("saved");
      },
      () => setState("failed"),
    );
  };
  const sendBad = (e: FormEvent) => {
    e.preventDefault();
    const words = note.trim();
    rate(words === "" ? { verdict: "bad" } : { verdict: "bad", note: words });
  };
  if (state === "saved")
    return (
      <p data-rating={run} data-rated className="text-jw-page-small text-muted-foreground">
        {say("chat_rate_thanks")}
      </p>
    );
  return (
    <div data-rating={run} className="flex flex-col gap-2 text-jw-page-body">
      <div className="flex flex-wrap items-center gap-2">
        <span id={labelId} className="text-jw-page-small text-jw-ink-soft">
          {say("chat_rate_ask")}
        </span>
        <ToggleGroup
          type="single"
          kind="rating"
          // Its items are radios (one pick), so the group says so for a screen reader.
          role="radiogroup"
          aria-labelledby={labelId}
          className="gap-0 rounded-jw-control bg-jw-hover p-0.5"
          disabled={state === "saving"}
          value={state === "missing" ? "bad" : ""}
          onValueChange={(value) => {
            if (value === "good") rate({ verdict: "good" });
            else setState(value === "bad" ? "missing" : "asking");
          }}
        >
          <ToggleGroupItem value="good" className={SEGMENT}>
            {say("chat_rate_good")}
          </ToggleGroupItem>
          <ToggleGroupItem value="bad" className={SEGMENT}>
            {say("chat_rate_bad")}
          </ToggleGroupItem>
        </ToggleGroup>
        {onRetry && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onRetry}>
            <RotateCcwIcon aria-hidden />
            {say("chat_rate_retry")}
          </Button>
        )}
      </div>
      {state === "missing" && (
        <form onSubmit={sendBad} className="flex flex-col gap-2">
          <label htmlFor={noteId} className="text-jw-page-small text-muted-foreground">
            {say("chat_rate_missing")}
          </label>
          <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" variant="outline" size="sm" className="self-start">
            {say("chat_rate_send")}
          </Button>
        </form>
      )}
      {state === "failed" && <p role="alert">{say("chat_rate_failed")}</p>}
    </div>
  );
}
