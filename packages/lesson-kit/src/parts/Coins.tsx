/**
 * Part: Polish coins and notes drawn as tokens (dl-w3.61.6): a coin is a circle, a note a
 * rectangle, each with its value written on it as the real one writes it ("50 gr", "2 zł"). Grosze
 * coins wear one metal tone and złoty coins another, notes a paper tone, all from the --money-*
 * tokens; the size grows with the value class, so a purse reads at a glance. No picture of a real
 * coin: the house rule is drawn tokens and UI-library icons, never custom art. Whether to show
 * real NBP pictures is the owner's question, not built.
 *
 * A question's figure (CoinRow, money_count) draws them in the question's ink instead (Slots
 * addendum 4.7): plain discs in real proportion, in one row. The metal tones stay on the tray the
 * child pays from (CoinFace).
 *
 * A part takes what to draw, never a family's types: families/money.ts turns a denomination into
 * a token (tokenOf).
 */

import { cn } from "@jadwigo/ui";

export type CoinMetal = "gr" | "zl" | "note";
export type CoinSize = "sm" | "md" | "lg" | "note";

export interface CoinToken {
  face: string;
  metal: CoinMetal;
  size: CoinSize;
  /** A coin's real diameter in mm: a figure draws its coins in proportion (CoinRow). */
  mm?: number | undefined;
}

const METAL: Record<CoinMetal, string> = {
  gr: "bg-[var(--money-gr)] text-[var(--money-gr-foreground)] border-[var(--money-gr-edge)]",
  zl: "bg-[var(--money-zl)] text-[var(--money-zl-foreground)] border-[var(--money-zl-edge)]",
  note: "bg-[var(--money-note)] text-[var(--money-note-foreground)] border-[var(--money-note-edge)]",
};

const SIZE: Record<CoinSize, string> = {
  sm: "size-[var(--money-coin-sm)] rounded-full text-xs",
  md: "size-[var(--money-coin-md)] rounded-full text-sm",
  lg: "size-[var(--money-coin-lg)] rounded-full text-base",
  note: "h-[var(--money-note-h)] w-[var(--money-note-w)] rounded-md text-base",
};

/** One coin or note. Decorative inside a labelled figure or button: the label says what it is. */
export function CoinFace({
  token,
  className,
}: {
  token: CoinToken;
  className?: string | undefined;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-coin={token.face}
      data-metal={token.metal}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border-2 font-bold whitespace-nowrap tabular-nums",
        METAL[token.metal],
        SIZE[token.size],
        className,
      )}
    >
      {token.face}
    </span>
  );
}

/** px per millimetre of a coin's real diameter on a laptop: the 1 zł coin (23 mm) is 92 px. */
const PX_PER_MM = 4;
/** A note on a laptop, in px. */
const NOTE = { w: 120, h: 60 };

/** One coin or note of a question's figure, in the question's ink (Slots addendum 4.7 and 2.6): a
 * circle (a note a rectangle) with a 3 px --text rim on --surface, its value and unit bold on two
 * lines. An SVG, so the words scale with the coin when a row has to shrink to stay one row. */
function InkCoin({ token }: { token: CoinToken }): JSX.Element {
  const [value, unit] = token.face.split(" ");
  const note = token.metal === "note" || token.mm === undefined;
  const w = note ? NOTE.w : (token.mm ?? 20) * PX_PER_MM;
  const h = note ? NOTE.h : w;
  const big = Math.round(h * 0.34);
  // The unit at least 12 px on a phone, where the coin is drawn at 0.62.
  const small = Math.max(20, Math.round(h * 0.22));
  const mid = h / 2;
  return (
    <svg
      aria-hidden="true"
      data-coin={token.face}
      data-metal={token.metal}
      viewBox={`0 0 ${w} ${h}`}
      // The phone scales every coin by --coin-scale (stage.css), and a row that is still too
      // wide shrinks them all alike rather than wrapping.
      style={{ width: `calc(${w}px * var(--coin-scale, 1))` }}
      className="block h-auto min-w-0 shrink overflow-visible"
    >
      {note ? (
        <rect
          x={1.5}
          y={1.5}
          width={w - 3}
          height={h - 3}
          rx={8}
          className="fill-card stroke-foreground"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <circle
          cx={w / 2}
          cy={mid}
          r={w / 2 - 1.5}
          className="fill-card stroke-foreground"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <text
        x={w / 2}
        y={mid - 2}
        textAnchor="middle"
        fontSize={big}
        className="fill-foreground font-bold tabular-nums"
      >
        {value}
      </text>
      <text
        x={w / 2}
        y={mid + small + 2}
        textAnchor="middle"
        fontSize={small}
        className="fill-foreground font-bold"
      >
        {unit}
      </text>
    </svg>
  );
}

/** A purse: coins and notes in one row, never wrapped (Slots addendum 2.5), read by a screen
 * reader as its label (which names the coins, never the total). */
export function CoinRow({
  tokens,
  label,
}: {
  tokens: readonly CoinToken[];
  label: string;
}): JSX.Element {
  return (
    <div
      role="img"
      aria-label={label}
      data-coins={tokens.length}
      className="flex max-w-full flex-nowrap items-center justify-center gap-[var(--coin-gap,0.75rem)]"
    >
      {tokens.map((token, i) => (
        <InkCoin key={i} token={token} />
      ))}
    </div>
  );
}
