/**
 * Good, Bad and Try again on a completed turn (dl-z5ja.63, research §15.6, dl-xo0q's band): "Jak
 * poszło? Dobrze · Słabo · Spróbuj jeszcze raz". The handoff's "Źle" is a word the copy never uses
 * bare (copy.test.ts), so Bad reads "Słabo" ("Not great" in English). Bad asks what was missing, a note the parent may
 * leave empty. The rating goes to `POST /api/v1/runs/{id}/ratings` with the turn's run id (wave 4
 * lead decision 37), never to an analytics event, since a note may hold learner data. Try again is
 * no route: the page sends the turn's own message again as a new turn.
 */

import type { RunId, RunRatingCreate } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { type FormEvent, type ReactElement, useState } from "react";
import { Button } from "../tool/button.tsx";

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
  const rate = (body: RunRatingCreate) => {
    setState("saving");
    onRate(run, body).then(
      () => setState("saved"),
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
      <p data-rating={run} data-rated className="text-muted-foreground text-sm">
        {say("chat_rate_thanks")}
      </p>
    );
  return (
    <div data-rating={run} className="flex flex-col gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span>{say("chat_rate_ask")}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={state === "saving"}
          onClick={() => rate({ verdict: "good" })}
        >
          {say("chat_rate_good")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={state === "saving"}
          onClick={() => setState("missing")}
        >
          {say("chat_rate_bad")}
        </Button>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {say("chat_rate_retry")}
          </Button>
        )}
      </div>
      {state === "missing" && (
        <form onSubmit={sendBad} className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            {say("chat_rate_missing")}
            <textarea
              value={note}
              rows={2}
              className="rounded-md border px-2 py-1"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <Button type="submit" variant="outline" size="sm" className="self-start">
            {say("chat_rate_send")}
          </Button>
        </form>
      )}
      {state === "failed" && <p role="alert">{say("chat_rate_failed")}</p>}
    </div>
  );
}
