/**
 * Part: the frame a step is drawn in, picked by input and shape, not width alone (lesson-frame
 * README §2, dl-uukj.29.53). One source: StepShell reads it with `useFrame` and sets it as
 * `data-frame` on the step, and styles/stage.css reads only that.
 *
 * - narrower than 600 → phone (the answer in the page, the keypad docked above the footer)
 * - a real keyboard and pointer → laptop (no keypad: the keyboard types, sign keys under the field)
 * - sideways and under 500 tall → phone sideways (the keypad docked right, 4 × 3)
 * - sideways with touch → tablet sideways (the keypad docked right, 3 × 4)
 * - upright and 600 or wider → tablet upright (the keypad docked above the footer, 420 wide)
 *
 * The window decides, never the step's own width: on a laptop the Try it column is under 600, and
 * a laptop never draws the phone's keypad (Enter addendum 4.2; the 2026-10-25 note on dl-uukj.29.53).
 */

import { type RefObject, useLayoutEffect, useState } from "react";

export type StepFrameKind = "phone" | "tablet" | "tablet-sideways" | "phone-sideways" | "laptop";

/** The width under which every window is a phone: 600 px, the one breakpoint (README §2). */
const PHONE_MAX = 600;
/** A sideways window under this height is a phone on its side. */
const SIDEWAYS_PHONE_MAX_HEIGHT = 500;

export function pickFrame({
  width,
  height,
  fine,
}: {
  width: number;
  height: number;
  fine: boolean;
}): StepFrameKind {
  if (width < PHONE_MAX) return "phone";
  if (fine) return "laptop";
  if (width > height)
    return height < SIDEWAYS_PHONE_MAX_HEIGHT ? "phone-sideways" : "tablet-sideways";
  return "tablet";
}

/** Where a frame puts the keypad and the letter row: docked above the footer, a column docked at
 * the right, or under the field on a laptop, where the keypad draws only a step's sign keys (Enter
 * addendum 4.2: no Narzędzia). */
export function toolsAt(frame: StepFrameKind): "tray" | "side" | "under" {
  if (frame === "laptop") return "under";
  return frame === "tablet-sideways" || frame === "phone-sideways" ? "side" : "tray";
}

/** The pointer and hover a laptop has. A page may say its input is touch (`data-input-touch` on an
 * ancestor: the playground's `?input=touch`, to preview a tablet on a laptop). A specimen may name
 * its frame outright (`data-frame-preview` on an ancestor: the System page's frozen footers, which
 * draw a phone's and a laptop's side by side in one window). */
const FINE = "(hover: hover) and (pointer: fine)";

/** The frame for the step under `ref`, from the window's size and the input, kept current as the
 * window turns or resizes. Without a window to read (a test) it is the phone. */
export function useFrame(ref: RefObject<HTMLElement>): StepFrameKind {
  const [frame, setFrame] = useState<StepFrameKind>("phone");
  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const fine = window.matchMedia(FINE);
    const read = (): void => {
      const preview = ref.current?.closest<HTMLElement>("[data-frame-preview]")?.dataset[
        "framePreview"
      ] as StepFrameKind | undefined;
      if (preview !== undefined) {
        setFrame(preview);
        return;
      }
      const touch = ref.current?.closest("[data-input-touch]") != null;
      setFrame(
        pickFrame({
          width: window.innerWidth,
          height: window.innerHeight,
          fine: fine.matches && !touch,
        }),
      );
    };
    read();
    window.addEventListener("resize", read);
    fine.addEventListener?.("change", read);
    return () => {
      window.removeEventListener("resize", read);
      fine.removeEventListener?.("change", read);
    };
  }, [ref]);
  return frame;
}

/** Whether the child is on touch, with no real keyboard and pointer (or the page says so with
 * `data-input-touch`): the system keyboard then comes and goes with a typed word (rule 18,
 * dl-uukj.29.51). */
export function useTouch(ref: RefObject<HTMLElement>): boolean {
  const [touch, setTouch] = useState(false);
  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const fine = window.matchMedia(FINE);
    const read = (): void =>
      setTouch(!fine.matches || ref.current?.closest("[data-input-touch]") != null);
    read();
    fine.addEventListener?.("change", read);
    return () => fine.removeEventListener?.("change", read);
  }, [ref]);
  return touch;
}

/** The mark on <html> once a hardware keyboard has typed on this page (useHardwareKeyboard). */
const HARDWARE = "hardwareKeys";
/** A keyboard smaller than this is no system keyboard (a browser's own bar coming and going). */
const SYSTEM_KEYBOARD_MIN = 120;

/**
 * Whether a real keyboard is at hand on a touch device (dl-uukj.29.174): an iPad with a Magic
 * Keyboard or a Bluetooth one hides the on-screen keyboard, and its Option layer has no Polish
 * letters, so the child still needs the letter row. Either a fine pointer is attached (a trackpad
 * or a mouse: `any-pointer: fine`), or a key typed a character into a field while no system
 * keyboard was up. A system keyboard is up when the visual viewport is more than 120 px shorter
 * than the tallest it has been at this width: that holds on iOS, which pans the page under its
 * keyboard (so `offsetTop` says nothing), and on Android Chrome, whose page shrinks with it
 * (`interactive-widget=resizes-content`, so `innerHeight` says nothing). Keyed by width, so a
 * turn of the phone is not taken for a keyboard. Android's on-screen keys mostly send
 * "Unidentified" (keyCode 229) too. Once seen it holds for the page. Under `data-input-touch`
 * (the page says touch) only a typed key counts.
 */
/** The tallest the visual viewport has been on this page, by the window's width. */
const tallest = new Map<number, number>();

/** The visual viewport's height now, after noting it as the tallest at this width if it is. */
function viewportHeight(): number {
  const height = window.visualViewport?.height ?? window.innerHeight;
  const width = Math.round(window.innerWidth);
  tallest.set(width, Math.max(tallest.get(width) ?? 0, height));
  return height;
}

/** Whether a system keyboard is up now: the viewport is well short of its tallest at this width. */
function systemKeyboardUp(): boolean {
  const height = viewportHeight();
  return (tallest.get(Math.round(window.innerWidth)) ?? height) - height > SYSTEM_KEYBOARD_MIN;
}

export function useHardwareKeyboard(ref: RefObject<HTMLElement>): boolean {
  const [hardware, setHardware] = useState(false);
  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const root = document.documentElement;
    const pointer =
      typeof window.matchMedia === "function" ? window.matchMedia("(any-pointer: fine)") : null;
    const said = (): boolean => ref.current?.closest("[data-input-touch]") != null;
    const read = (): void =>
      setHardware((pointer?.matches === true && !said()) || HARDWARE in root.dataset);
    const typed = (event: KeyboardEvent): void => {
      if (event.isComposing || event.key.length !== 1) return;
      // Already seen (by another step's listener, say): this one reads it too.
      if (HARDWARE in root.dataset) {
        read();
        return;
      }
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (systemKeyboardUp()) return;
      root.dataset[HARDWARE] = "";
      read();
    };
    // The page opens with no keyboard up: its height then is the tallest to measure against.
    const note = (): void => {
      viewportHeight();
    };
    note();
    read();
    pointer?.addEventListener?.("change", read);
    document.addEventListener("keydown", typed, true);
    window.visualViewport?.addEventListener("resize", note);
    return () => {
      pointer?.removeEventListener?.("change", read);
      document.removeEventListener("keydown", typed, true);
      window.visualViewport?.removeEventListener("resize", note);
    };
  }, [ref]);
  return hardware;
}

/** How far the system keyboard covers the bottom of the window, from the visual viewport: 0 while
 * it is down. */
export function keyboardInset(
  innerHeight: number,
  viewport: { height: number; offsetTop: number },
): number {
  return Math.max(0, Math.round(innerHeight - viewport.height - viewport.offsetTop));
}
