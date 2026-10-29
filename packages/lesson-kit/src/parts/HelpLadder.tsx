/**
 * Part: the help note (lesson frame rule 6, decision dl-q3p9; docs/plan/design-system/lesson-frame
 * README §3). One note that grows: each new card joins under a 1px line, the older ones turn
 * muted, and a counter reads "n z m", m being the cards the step really has. Under the cards,
 * "Więcej pomocy" while more can be given, and at the very end the quiet "Jeszcze nie wiem" link,
 * the only way out of a step (rule 5). It is the sticky note of the notebook: help's warm yellow,
 * its darker edge.
 *
 * When the note opens or grows it comes into view with the least scroll (Choose addendum 1.1,
 * paper-behaviour README §3.2, scroll.ts): the whole note, or its top 16 px under the top bar when it
 * is taller than the room. A note grown taller than the room shows its newest card the same way, so
 * the card the child asked for is never left below the footer (dl-uukj.29.77). Opened by a tap, it
 * scrolls once the finger lifts (dl-uukj.29.153). It never takes the focus:
 * on a laptop the focus stays in the field, so typing goes on, and on "Więcej pomocy", which has
 * moved down under the new card, so a second press works. The step's one live region reads it.
 */

import { copy } from "@jadwigo/copy";
import { Button, cn } from "@jadwigo/ui";
import { type ReactNode, useEffect, useRef } from "react";
import type { PressHandlers } from "../stage/press.ts";
import type { Language } from "../stage/types.ts";
import { afterRelease, insetsOf, scrollToShow } from "./scroll.ts";
import { STATUS } from "./status.ts";

// The bulb and the eye come from the state table, the one place a step's icons are named (docs/17 §2f rule 3).
function TableIcon({
  row,
  className,
}: {
  row: "boost" | "moved_on";
  className: string;
}): JSX.Element | null {
  const Icon = STATUS[row].icon;
  return Icon === null || Icon === "spinner" ? null : <Icon aria-hidden className={className} />;
}

export function HelpLadder({
  language,
  cards,
  of,
  more = null,
  dontKnow = null,
  refused = false,
}: {
  language: Language;
  /** Every card released so far, oldest first. */
  cards: readonly ReactNode[];
  /** How many cards the step has in all; null while unknown (a rung the api wrote itself, with
   * more to come), and then the counter is not drawn rather than guess (dl-uukj.29.154). */
  of: number | null;
  /** "Więcej pomocy", while more can be given now. */
  more?: PressHandlers | null | undefined;
  /** "Jeszcze nie wiem": ends the step and shows its solution. */
  dontKnow?: PressHandlers | null | undefined;
  /** The last request found nothing to give until the child has a go. */
  refused?: boolean | undefined;
}): JSX.Element {
  const n = cards.length;
  const note = useRef<HTMLElement>(null);
  const newest = useRef<HTMLLIElement>(null);
  const shown = useRef<number | null>(null);
  useEffect(() => {
    const el = note.current;
    // In a lesson the note that opens comes into view too; a still on a review page stays put.
    const opened = shown.current === null && el?.closest("[data-learner-view], .kid-page") != null;
    // A tap opens help on pointerdown, and nothing scrolls while a finger is down, so the scroll
    // waits for it to lift (owner 2026-10-29, dl-uukj.29.153): else a tapped note opened unseen.
    if (el && (n > (shown.current ?? n) || opened))
      afterRelease(() => {
        // The step may have gone before the finger lifted.
        if (!el.isConnected) return;
        const insets = insetsOf(el);
        const room = window.innerHeight - insets.top - insets.bottom;
        const card = newest.current;
        scrollToShow(card !== null && el.getBoundingClientRect().height > room ? card : el, insets);
      });
    shown.current = n;
  }, [n]);

  return (
    <aside ref={note} data-help-note data-help-ladder className="kid-help-note">
      <p data-help-head>
        <TableIcon row="boost" className="kid-help-bulb" />
        <span>{copy(language, "ds_help_title")}</span>
        {n > 0 && of !== null && (
          <span data-help-count>{copy(language, "ds_hint_of", { n, of: Math.max(of, n) })}</span>
        )}
      </p>
      {n > 0 && (
        <ol data-help-cards>
          {cards.map((card, i) => (
            <li
              key={i}
              ref={i === n - 1 ? newest : undefined}
              data-help-card
              data-old={i < n - 1 || undefined}
              className={cn(i === n - 1 && "kid-clue-in")}
            >
              {card}
            </li>
          ))}
        </ol>
      )}
      {refused && <p data-help-refused>{copy(language, "help_try_first")}</p>}
      {more && (
        <Button
          type="button"
          variant="outline"
          data-help-ask
          data-help-more
          onPointerDown={more.onPointerDown}
          onClick={more.onClick}
        >
          <TableIcon row="boost" className="kid-help-bulb" />
          {copy(language, "help_more")}
        </Button>
      )}
      {dontKnow && (
        <Button
          type="button"
          variant="ghost"
          data-dont-know
          className="kid-quiet kid-move-on underline"
          onPointerDown={dontKnow.onPointerDown}
          onClick={dontKnow.onClick}
        >
          <TableIcon row="moved_on" className="kid-help-eye" />
          {copy(language, "dont_know_yet")}
        </Button>
      )}
    </aside>
  );
}
