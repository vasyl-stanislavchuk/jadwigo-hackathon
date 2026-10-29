/**
 * Part: a word a child taps to see what it means (dl-w3.56), written in lesson text as
 * `[word](def: meaning)` (richTextParse.ts). Khan's `definition` widget, a `togglePrompt` word and
 * its `definition` (https://github.com/Khan/perseus/tree/main/packages/perseus/src/widgets/definition),
 * read and cited, never copied.
 *
 * The word is a button in the run of text with a dotted underline, opened by tap, Enter or Space
 * (a native button), closed by Escape or a tap outside, focus back on the word (the shadcn
 * popover). The meaning floats in a portal, so the text around the word never moves. The hit area
 * reaches above and below the word through a pseudo-element, without changing the line's height.
 * On paper there is nothing to tap, so the meaning follows the word in brackets.
 */

import { Popover, PopoverContent, PopoverTrigger } from "@jadwigo/ui";
import { type ReactNode, useState } from "react";

export function Term({
  word,
  meaning,
  paper = false,
}: {
  word: ReactNode;
  meaning: ReactNode;
  paper?: boolean | undefined;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  if (paper) {
    return (
      <span data-term="paper">
        {word} <span className="text-muted-foreground">({meaning})</span>
      </span>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-term="button"
          className="relative inline cursor-help rounded-sm underline decoration-primary decoration-dotted decoration-2 underline-offset-4 before:absolute before:inset-x-0 before:-inset-y-3 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {word}
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-term="meaning"
        className="max-w-prose px-4 py-3 text-kid-answer leading-snug"
      >
        {meaning}
      </PopoverContent>
    </Popover>
  );
}
