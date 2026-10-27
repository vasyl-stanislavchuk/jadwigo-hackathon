/**
 * Part: the answer's tools, the keypad and the Polish letter row, as the lesson frame places them
 * (lesson-frame/README.md rules 7, 8 and 12, dl-uukj.29.44; Enter addendum 4.1 and 4.2,
 * dl-uukj.29.104). A family view wraps each in <Tools>, and the step frame (StepShell.tsx) says
 * where it goes through the Tray context:
 *
 * - On a phone and an upright tablet in a lesson the answer sits in the page, and its tools are
 *   docked above the footer, as the system keyboard is (Choose addendum 1.1.1, dl-uukj.29.83). They
 *   fold away by their arrow or by themselves when help opens, and a tap on a field opens them
 *   again. Folded, they stay mounted, so a hardware keyboard still types. Outside a lesson they are
 *   drawn under the fields, with the arrow beside them.
 * - Sideways (a tablet, or a phone on its side) the keypad is docked at the right and stays put
 *   while the column scrolls (styles/stage.css).
 * - On a laptop there is no keypad and no Narzędzia (Enter addendum 4.2, which changes README rule
 *   9): the keyboard types, and the tools stay where the view puts them, under the field. The
 *   keypad draws only a step's sign keys there (Keypad.tsx), and the letter row its one row of ten.
 * - Once the step ends (right, or the solution) the tools are not drawn. The frame keeps their
 *   space, so nothing moves, and the solution fills it.
 *
 * Outside a step frame (a part shown on its own) the tools are drawn as they are.
 */

import { createContext, type ReactNode, useContext, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export type ToolKind = "keypad" | "letters";

/** The frame a step is drawn in, picked by input and shape (frame.ts, README §2). */
export type { StepFrameKind } from "./frame.ts";

import type { StepFrameKind } from "./frame.ts";

export interface TrayValue {
  frame: StepFrameKind;
  folded: boolean;
  ended: boolean;
  /** Whether the tools are docked above the footer (a phone or an upright tablet in a lesson). */
  docked: boolean;
  /** The dock, where they are drawn then; null until it is in the page. */
  dock: HTMLElement | null;
  /** Tell the frame a kind of tool is on the step; returns the undo. */
  register(kind: ToolKind): () => void;
}

export const Tray = createContext<TrayValue | null>(null);

export function Tools({
  kind,
  children,
}: {
  kind: ToolKind;
  children: ReactNode;
}): JSX.Element | null {
  const tray = useContext(Tray);
  const register = tray?.register;
  useLayoutEffect(() => register?.(kind), [register, kind]);
  if (tray === null) return <>{children}</>;
  if (tray.ended) return null;
  if (tray.docked)
    return tray.dock ? (
      createPortal(<div data-tools={kind}>{children}</div>, tray.dock)
    ) : (
      <div hidden>{children}</div>
    );
  // On a laptop a number step's keypad draws nothing: no box, so the field keeps its gap.
  if (tray.frame === "laptop")
    return (
      <div data-tools={kind} className="contents">
        {children}
      </div>
    );
  return (
    <div data-tools={kind} hidden={tray.folded}>
      {children}
    </div>
  );
}
