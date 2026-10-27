/**
 * The stem of a family step: what sits above the answer when `say` is not enough. A claim or a
 * task in words, a picture or several, a terminal card. Every family's data may carry one
 * (Choose always could; Enter, Gaps, Sequence and Group gained it with the Khan items, dl-w3.52).
 * `families/Stem.tsx` draws it the same way for every family. (A `stem.ts` beside `Stem.tsx` would
 * collide on a case-insensitive disk, so the model sits in its own folder, as a family's does.)
 */

export type { Picture, Stem, StemReference } from "@jadwigo/contracts";
