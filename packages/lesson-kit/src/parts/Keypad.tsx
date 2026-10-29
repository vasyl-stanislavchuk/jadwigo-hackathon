/**
 * Part: the digit keypad on shadcn/ui (dl-0ax3.2), as the Enter session drew it (Enter addendum
 * 4.1 and 4.2, dl-uukj.29.104). It drives the composer beside it (composer.ts), from taps and from
 * a hardware keyboard. production, fill_blank and number_line's read mode use it.
 *
 * - The pad (a phone, a tablet, a part on its own): digits 1 to 9 in three columns, then
 *   [extra] 0 [backspace]. Keys 72 tall, 30 px bold, 8 apart. The cell left of 0 holds the step's
 *   one extra key: `,` for a decimal, `/` for a fraction typed on one line, `=` for an equation.
 *   With none it is empty, and keeps its space. An expression's signs × ÷ + − ( ) are one row of
 *   56 px keys, 28 px bold, above the digits. There is no → key: Sprawdź is under the keypad.
 * - On a laptop there is no keypad (no Narzędzia, addendum 4.2): the keyboard types. A step with
 *   signs shows them as a row of 56 × 56 keys under its field, 26 px bold, 8 apart, while the step
 *   is open. A number step shows nothing. The part stays mounted, so the keyboard still types.
 *
 * A sign goes out through `onSign`, never the composer, and a hardware `*`, `x` or `/` types the
 * matching sign through `signOf`.
 *
 * Quiet (Slots addendum 2.2, dl-uukj.29.123): while a chosen gap's list is open the pad stays
 * docked, every key where it was, but goes quiet: the page's fill, muted digits, no pressed edge
 * (styles/foundation.css, [data-keypad-pad][data-quiet]), and no key types, a tap or a hardware key.
 */

import { type CopyKey, copy } from "@jadwigo/copy";
import { Button, cn } from "@jadwigo/ui";
import { useContext, useEffect, useRef } from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import { type PressModality, press } from "../stage/press.ts";
import type { Language } from "../stage/types.ts";
import { type ComposerEvent, keyEvent, onControl } from "./composer.ts";
import { Tray } from "./Tools.tsx";

/** Every key is a square-cornered tile: 10 px corners (the System page's keys), a 2 px line on its 4 px edge, paper. */
const TILE = "rounded-jw-small border-2 bg-card p-0 font-bold";
/** A digit key on the pad: 72 tall, 30 px. */
const DIGIT = cn(TILE, "min-h-kid-key text-[1.875rem]");
/** A sign key in the pad's row above the digits: 56 tall, 28 px. Six share the phone's 358 column,
 * so each is 53 wide (min-w-0), as drawn. */
const PAD_SIGN = cn(TILE, "min-h-kid-tap min-w-0 text-[1.75rem]");
/** A sign key in the laptop's row under the field: 56 × 56, 26 px. */
const STRIP_SIGN = cn(TILE, "min-h-kid-tap min-w-kid-tap text-[1.625rem]");

/** The signs that take the cell left of 0 on the pad, the step's one extra key. */
const EXTRA_KEYS: readonly string[] = [",", "/", "="];

/** What a screen reader calls each sign key. */
const SIGN_NAMES: Record<string, CopyKey> = {
  "×": "sign_times",
  "÷": "sign_divide",
  "+": "sign_plus",
  "−": "sign_minus",
  "(": "bracket_open",
  ")": "bracket_close",
  ",": "decimal_comma",
  "=": "sign_equals",
};

export interface SignKeys {
  /** The sign keys to draw, in order. */
  signs: readonly string[];
  /** The sign a hardware key stands for (`*` is ×), or null. */
  signOf(key: string): string | null;
  onSign(sign: string, at: Instant, source: PressModality): void;
}

/** The pad's layout of a step's signs: the one extra key left of 0 (the last of `,` `/` `=` the
 * step has), and the row above the digits (every other sign). */
function padLayout(signs: readonly string[]): { extra: string | null; row: string[] } {
  const extra = [...signs].reverse().find((s) => EXTRA_KEYS.includes(s)) ?? null;
  return { extra, row: signs.filter((s) => s !== extra) };
}

export function Keypad({
  language,
  clock,
  signKeys,
  onEvent,
  checkKey = false,
  quiet = false,
}: {
  language: Language;
  clock: Clock;
  signKeys?: SignKeys | undefined;
  onEvent(ev: ComposerEvent): void;
  /** A built block with no footer: the old Check key in the bottom row's right. */
  checkKey?: boolean | undefined;
  /** A chosen gap's list is open: the keys stay, quiet, and type nothing (Slots addendum 2.2). */
  quiet?: boolean | undefined;
}): JSX.Element | null {
  const quietRef = useRef(quiet);
  quietRef.current = quiet;
  const sendRef = useRef(onEvent);
  sendRef.current = (ev) => {
    if (!quietRef.current) onEvent(ev);
  };
  const signRef = useRef(signKeys);
  signRef.current = signKeys;
  // In a step frame on a laptop the keyboard types and only the signs are drawn (addendum 4.2).
  const tray = useContext(Tray);
  const strip = tray?.frame === "laptop";

  // A hardware keyboard types into the blank whenever one is attached.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Quiet, the open list keeps its keys (↑ ↓ Enter Escape) and nothing types.
      if (quietRef.current) return;
      const ev = keyEvent(event.key, clock.now(), onControl(event.target));
      if (ev !== null) {
        event.preventDefault();
        return sendRef.current(ev);
      }
      const keys = signRef.current;
      const sign = keys?.signOf(event.key) ?? null;
      if (keys === undefined || sign === null) return;
      event.preventDefault();
      keys.onSign(sign, clock.now(), "keyboard");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clock]);

  // pointerdown for a tap, click (detail 0) for a keyboard or screen-reader activation.
  const handlers = (event: (at: Instant, modality: PressModality) => ComposerEvent) => {
    const h = press(clock, (at, modality) => sendRef.current(event(at, modality)));
    return { onPointerDown: h.onPointerDown, onClick: h.onClick };
  };
  const digit = (d: string) => (
    <Button
      key={d}
      type="button"
      variant="outline"
      className={DIGIT}
      {...handlers((at, source) => ({ type: "digit", digit: d, at, source }))}
    >
      {d}
    </Button>
  );
  const sign = (s: string, look: string) => {
    const h = press(clock, (at, modality) => {
      if (!quietRef.current) signRef.current?.onSign(s, at, modality);
    });
    return (
      <Button
        key={s}
        type="button"
        variant="outline"
        className={look}
        aria-label={SIGN_NAMES[s] ? copy(language, SIGN_NAMES[s]) : s}
        data-sign={s}
        onPointerDown={h.onPointerDown}
        onClick={h.onClick}
      >
        <span aria-hidden="true">{s}</span>
      </Button>
    );
  };
  const signs = signKeys?.signs ?? [];

  if (strip) {
    if (signs.length === 0) return null;
    return (
      <div
        data-signs="strip"
        data-quiet={quiet ? "" : undefined}
        aria-disabled={quiet || undefined}
        className="flex flex-wrap gap-2"
      >
        {signs.map((s) => sign(s, STRIP_SIGN))}
      </div>
    );
  }

  const erase = (
    <Button
      key="erase"
      type="button"
      variant="outline"
      className={DIGIT}
      aria-label={copy(language, "erase")}
      {...handlers(() => ({ type: "backspace" }))}
    >
      <span aria-hidden="true">⌫</span>
    </Button>
  );
  const { extra, row } = padLayout(signs);
  const bottom = checkKey
    ? [
        erase,
        digit("0"),
        <Button
          key="check"
          type="button"
          className={cn(DIGIT, "px-1 text-xl")}
          {...handlers(() => ({ type: "enter" }))}
        >
          {copy(language, "check")}
        </Button>,
      ]
    : [
        extra !== null ? sign(extra, DIGIT) : <span key="none" data-key-empty aria-hidden="true" />,
        digit("0"),
        erase,
      ];
  return (
    <div
      data-keypad-pad
      data-quiet={quiet ? "" : undefined}
      aria-disabled={quiet || undefined}
      className={cn("flex w-full flex-col gap-2", tray === null && "max-w-sm")}
    >
      {row.length > 0 && (
        <div
          data-signs="row"
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
        >
          {row.map((s) => sign(s, PAD_SIGN))}
        </div>
      )}
      <div data-keypad className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(digit)}
        {bottom}
      </div>
    </div>
  );
}
