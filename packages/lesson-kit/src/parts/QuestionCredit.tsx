/**
 * Part: the credit on a borrowed question, "z Khan Academy", and the card it opens (dl-uukj.29.136,
 * docs/plan/design-system/source-credit/README.md §1 to §3, decision dl-jxxs). A lesson is a set of
 * questions and the credit is per question: whoever draws one question (the playground's Try it,
 * a lesson's question block) puts its credit in `QuestionCredit`, and the step's instruction row
 * draws the trigger at its right end (families/Stem.tsx). Our own and bank questions have none,
 * and the row then holds the instruction alone, with no space kept.
 *
 * The trigger is a small muted label with a dotted underline, never spoken by the voice. A tap or a
 * click toggles the card; on a laptop a hover opens it too, and leaving both the trigger and the
 * card closes it unless a click opened it. It also closes on its ×, Esc (the focus back on the
 * trigger), a tap outside, Sprawdź, and the next question. Enter or Space on the trigger toggles
 * the card and does not check the answer: the step's Enter leaves a button its own (stepKeys.ts,
 * Runner.tsx OWN_ENTER). The card's links leave Jadwigo, so each opens the leave confirmation first
 * (LeaveJadwigo.tsx).
 *
 * The data is lane 1's credit view (content/credit.ts `creditView`), which the playground passes
 * in; a part may not import content/, so its shape is restated here as `CreditShown`.
 */

import { type CopyKey, copy } from "@jadwigo/copy";
import { X } from "lucide-react";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Language } from "../stage/types.ts";
import { LeaveGuard, OutsideLink } from "./LeaveJadwigo.tsx";

/** What the trigger and the card show (content/credit.ts CreditView). */
export interface CreditShown {
  source: string;
  from?: string | undefined;
  licence: string;
  deedUrl: string;
  line: "shared" | "translated" | "adapted" | "both";
  notice?: string | undefined;
  noticeLink?: string | undefined;
  home: string;
  notAffiliated: boolean;
}

/** One question's credit, in the language the question is shown in; null for our own. */
interface QuestionCreditValue {
  credit: CreditShown;
  language: Language;
}

const Credit = createContext<QuestionCreditValue | null>(null);

/** Put a question's credit around its step; `credit` null (our own, a bank's) shows nothing. */
export function QuestionCredit({
  credit,
  language,
  children,
}: {
  credit: CreditShown | null;
  language: Language;
  children: ReactNode;
}): JSX.Element {
  return (
    <Credit.Provider value={credit === null ? null : { credit, language }}>
      {children}
    </Credit.Provider>
  );
}

/** The question's credit, or null. */
function useQuestionCredit(): QuestionCreditValue | null {
  return useContext(Credit);
}

const LINE_KEY: Record<CreditShown["line"], CopyKey> = {
  shared: "credit_shared",
  translated: "credit_translated",
  adapted: "credit_adapted",
  both: "credit_both",
};

/** A line of copy with one `{slot}` drawn as `node`: the licence name or the source's name, linked. */
function withLink(text: string, slot: string, node: ReactNode): ReactNode {
  const at = text.indexOf(slot);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      {node}
      {text.slice(at + slot.length)}
    </>
  );
}

type Opened = "click" | "hover" | null;

/** The card's width, as README §2 draws it under the trigger. */
const CARD_WIDTH = 320;
/** The narrowest card that may stand beside the column: its title and the licence name still fit. */
const BESIDE_MIN_WIDTH = 240;
/** From the column's edge to the card: a transparent bridge, so a mouse moving across keeps it open. */
export const BESIDE_GAP = 12;
/** Kept clear between the card and the edge of the room it may use. */
export const BESIDE_EDGE = 16;

/**
 * The placement rule (owner, 2026-10-27, dl-uukj.29.138): the open card must not cover the
 * question. `roomRight` is the right edge of the free space the card may use beside the column:
 * the window in a lesson on a laptop (the step framed in it, data-frame laptop), the page left of
 * the controls panel in the playground (`data-credit-room`), and null anywhere else (a phone, a
 * tablet). When the margin between the column and that edge holds a card of at least
 * BESIDE_MIN_WIDTH plus the gap and the edge, the card stands there, top-aligned with the credit,
 * as wide as the margin allows up to CARD_WIDTH, and the width it gets is returned; otherwise
 * null. The 720 lesson column centred in the window goes beside from a window 1256 wide (a 252
 * card at 1280, the full 320 from 1416).
 */
export function besideWidth({
  roomRight,
  columnRight,
}: {
  roomRight: number | null;
  columnRight: number;
}): number | null {
  if (roomRight === null) return null;
  const room = Math.floor(roomRight - columnRight - BESIDE_GAP - BESIDE_EDGE);
  return room >= BESIDE_MIN_WIDTH ? Math.min(CARD_WIDTH, room) : null;
}

/**
 * In the playground, when the controls panel leaves no margin beside the column: does the card fit
 * above the column, its bottom BESIDE_GAP over the column's top and its top 8 clear of the header
 * (`ceiling`)? Then it covers the page's title and tabs, never the question or the panel. A card
 * left-aligned to the credit and growing right is no help there: under the credit it still covers
 * the question card, and the panel leaves no room for it beside.
 */
export function fitsAboveColumn({
  columnTop,
  ceiling,
  cardHeight,
}: {
  columnTop: number;
  ceiling: number;
  cardHeight: number;
}): boolean {
  return columnTop - BESIDE_GAP - cardHeight >= ceiling + 8;
}

type Place =
  | { at: "below" | "above" }
  | { at: "beside"; width: number; bridge: number }
  | { at: "over-column"; lift: number };
const UNDER: Place = { at: "below" };

/** A mouse that can hover: on a touch screen a tap is the only way to open the card. */
const canHover = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: hover)").matches;

/** The trigger and its card, for one question's credit. */
function CreditControl({ credit, language }: QuestionCreditValue): JSX.Element {
  const [opened, setOpened] = useState<Opened>(null);
  const [place, setPlace] = useState<Place>(UNDER);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const cardId = useId();
  const titleId = useId();
  const open = opened !== null;

  const close = (focusBack: boolean): void => {
    setOpened(null);
    if (focusBack) trigger.current?.focus();
  };

  // Where the card opens (README §2, and the owner's change of 2026-10-27, dl-uukj.29.138): beside
  // the column when the margin right of it holds the card; in the playground, else above the
  // column; else under the trigger, or above it when there is no room below inside the scroll area
  // (the window less the step's footer).
  useLayoutEffect(() => {
    if (!open) return setPlace(UNDER);
    const measure = (): void => {
      const w = wrap.current;
      const t = trigger.current?.getBoundingClientRect();
      const c = card.current?.getBoundingClientRect();
      if (!w || !t || !c) return;
      const column = (w.closest("[data-stage]") ?? w.parentElement ?? w).getBoundingClientRect();
      const lesson = w.closest('[data-step-shell][data-framed][data-frame="laptop"]') !== null;
      const area = lesson ? null : w.closest("[data-credit-room]");
      const width = besideWidth({
        roomRight: lesson
          ? document.documentElement.clientWidth
          : area
            ? area.getBoundingClientRect().right
            : null,
        columnRight: column.right,
      });
      const wrapBox = w.getBoundingClientRect();
      if (width !== null) {
        setPlace({ at: "beside", width, bridge: column.right - wrapBox.right + BESIDE_GAP });
        return;
      }
      if (area) {
        const ceiling = Math.max(
          0,
          area.getBoundingClientRect().top,
          document.querySelector("[data-credit-ceiling]")?.getBoundingClientRect().bottom ?? 0,
        );
        const cardHeight =
          card.current?.querySelector("[data-credit-panel]")?.getBoundingClientRect().height ??
          c.height;
        if (fitsAboveColumn({ columnTop: column.top, ceiling, cardHeight })) {
          setPlace({ at: "over-column", lift: wrapBox.top - column.top + BESIDE_GAP });
          return;
        }
      }
      const bar =
        document.querySelector("[data-bar]")?.getBoundingClientRect().top ?? window.innerHeight;
      const top = document.querySelector("[data-topbar]")?.getBoundingClientRect().bottom ?? 0;
      const below = bar - t.bottom;
      const room = t.top - top;
      setPlace({ at: c.height > below && room > below ? "above" : "below" });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  // While open: Esc closes it, a press outside closes it (Sprawdź among them), and so does an
  // Enter that checks the answer from a field.
  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null): boolean =>
      target instanceof Node && wrap.current?.contains(target) === true;
    const onDown = (event: PointerEvent): void => {
      if (!inside(event.target)) setOpened(null);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        const focusBack = inside(document.activeElement);
        setOpened(null);
        if (focusBack) trigger.current?.focus();
      } else if (event.key === "Enter" && !inside(event.target)) setOpened(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = credit.from ?? copy(language, "credit_from", { source: credit.source });
  const licenceLink = (
    <OutsideLink href={credit.deedUrl}>
      <span data-credit-link>{credit.licence}</span>
    </OutsideLink>
  );
  return (
    <div
      ref={wrap}
      data-credit-wrap
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && canHover() && opened === null) setOpened("hover");
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && opened === "hover") setOpened(null);
      }}
    >
      <button
        ref={trigger}
        type="button"
        data-credit-trigger
        aria-label={copy(language, "credit_label", { source: credit.source })}
        aria-expanded={open}
        aria-controls={cardId}
        // A hover opened it: the click keeps it open. Opened by a click (or Enter, or Space),
        // the next one closes it.
        onClick={() => setOpened((was) => (was === "click" ? null : "click"))}
      >
        {label}
      </button>
      <div
        ref={card}
        id={cardId}
        data-credit-card
        data-place={place.at}
        style={
          place.at === "beside"
            ? ({
                "--credit-width": `${place.width}px`,
                "--credit-bridge": `${place.bridge}px`,
              } as CSSProperties)
            : place.at === "over-column"
              ? ({ "--credit-lift": `${place.lift}px` } as CSSProperties)
              : undefined
        }
        hidden={!open || undefined}
      >
        <div role="dialog" aria-modal="false" aria-labelledby={titleId} data-credit-panel>
          <div data-credit-head>
            <p id={titleId} data-credit-title>
              {copy(language, "credit_title", { source: credit.source })}
            </p>
            <button
              type="button"
              data-credit-close
              aria-label={copy(language, "credit_close")}
              onClick={() => close(true)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <LeaveGuard language={language}>
            <p data-credit-licence>
              {withLink(copy(language, LINE_KEY[credit.line]), "{licence}", licenceLink)}
            </p>
            <p data-credit-notice>
              {credit.notice !== undefined
                ? withLink(
                    credit.notice,
                    credit.noticeLink ?? "",
                    <OutsideLink href={credit.home}>
                      <span data-credit-link>{credit.noticeLink}</span>
                    </OutsideLink>,
                  )
                : withLink(
                    copy(language, "credit_source"),
                    "{source}",
                    <OutsideLink href={credit.home}>
                      <span data-credit-link>{credit.source}</span>
                    </OutsideLink>,
                  )}
            </p>
            {credit.notAffiliated && (
              <p data-credit-not-affiliated>
                {copy(language, "credit_not_affiliated", { source: credit.source })}
              </p>
            )}
          </LeaveGuard>
        </div>
      </div>
    </div>
  );
}

/**
 * The instruction row (README §1): the instruction, and the credit at its right end. It wraps
 * under a long instruction and stands alone, right-aligned, when there is no instruction. With no
 * credit it is the instruction alone, as before.
 */
export function CreditRow({ children }: { children?: ReactNode }): JSX.Element | null {
  const value = useQuestionCredit();
  if (value === null) return children === undefined ? null : <>{children}</>;
  return (
    <div data-instruction-row data-alone={children === undefined || undefined}>
      {children}
      <CreditControl {...value} />
    </div>
  );
}
