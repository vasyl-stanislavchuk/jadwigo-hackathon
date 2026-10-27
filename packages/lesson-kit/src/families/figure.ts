/**
 * A figure: something to answer about, drawn above the answer (dl-w3.47). Every family that shows
 * a task can carry one: Enter in its data, Gaps in its data, Choose in its stem. The kinds follow
 * the three CRA levels the playground switches between (decision
 * 2026-10-18-the-playground-s-abstraction-switch-has-three-cra-levels): groups of objects are
 * concrete, dots in rows and the number line are representational, an expression is abstract.
 * The first two kinds moved here from enter/model.ts, which re-exports them.
 *
 * A figure is page data: it is drawn, never spoken, and it never holds the key. The alt text of a
 * drawing says what it shows, never what to count or the answer (validate.ts `missing_alt`).
 */

import { type Figure, GroupIcon } from "@jadwigo/contracts";

export type { Figure };

/** The units a ruler figure is marked in, as a real ruler writes them (never translated). */
export type RulerUnit = Extract<Figure, { kind: "ruler" }>["unit"];

/** The objects a concrete figure may draw, from the icon library the UI uses, never custom art
 * (decision 2026-10-18-2026-10-18-engagement-uses-simple-sounds-and-animations-from-ui). */
export const GROUP_ICONS = GroupIcon.options;
export type { GroupIcon };
