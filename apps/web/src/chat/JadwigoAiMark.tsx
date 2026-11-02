/**
 * Jadwigo AI's mark in the chat (dl-uukj.47.28; owner's call of 2026-11-02, "Jadwigo AI in the
 * parent app"): the logo's crown in a 24 px disc, beside the name that heads each of its turns.
 * Decorative: the name next to it says who is speaking.
 */

import { Logo } from "@jadwigo/ui";
import type { ReactElement } from "react";

export function JadwigoAiMark(): ReactElement {
  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-full bg-jw-pick"
      data-ai-mark
    >
      <Logo mark label="" className="h-3" />
    </span>
  );
}
