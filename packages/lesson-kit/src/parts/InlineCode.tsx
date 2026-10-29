/**
 * Part: a lesson string with its backtick spans shown as code (dl-i952.19, variant C). Every block
 * that shows lesson text draws it through this, so `bd ready` in a sentence reads as a command,
 * not as words. A chip is monospace on the muted ground and wraps only between words: each word is
 * unbreakable, so an id like demo-2ma never breaks at its hyphen. The stored text never changes,
 * and the voice reads it through speakable() (code.ts), never with the marks.
 */

import { cn } from "@jadwigo/ui";
import { Fragment } from "react";
import { splitInline } from "./code.ts";

/** One chip. `paper` is the printed look: a thin outline in the ink and no fill. */
export function CodeChip({
  text,
  paper = false,
}: {
  text: string;
  paper?: boolean | undefined;
}): JSX.Element {
  return (
    <code
      data-inline-code=""
      className={cn(
        "rounded-sm px-[0.32em] py-[0.06em] font-mono text-[0.86em] font-medium [box-decoration-break:clone]",
        paper ? "border border-jw-ink" : "bg-muted text-foreground",
      )}
    >
      {text.split(/( +)/).map((word, index) =>
        /^ +$/.test(word) ? (
          <Fragment key={index}>{word}</Fragment>
        ) : (
          <span key={index} className="whitespace-nowrap">
            {word}
          </span>
        ),
      )}
    </code>
  );
}

/** A lesson string as text and chips; a fragment, so it sits inside the host's own element. */
export function InlineCode({
  text,
  paper = false,
}: {
  text: string;
  paper?: boolean | undefined;
}): JSX.Element {
  return (
    <>
      {splitInline(text).map((piece, index) =>
        piece.code ? (
          <CodeChip key={index} text={piece.text} paper={paper} />
        ) : (
          <Fragment key={index}>{piece.text}</Fragment>
        ),
      )}
    </>
  );
}
