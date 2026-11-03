/**
 * The frame every learner widget sits in (handoff dl-uukj.47.71 §4.3): a bordered card with a
 * header (icon, title, meta) and a body no taller than 240 px. Past that, a ghost row "Pokaż
 * wszystkie ({n})" opens the rest in place. A widget arrives whole with its result, so the frame has
 * no loading state.
 *
 * Rows (a Tydzień's lessons) are cut by count: 6 rows of 9 + 20 + 9 px fill the 240. A free body
 * (the P2 widgets, until their bodies are drawn as rows) is cut by its measured height.
 */

import { copy, type Language } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import type { LucideIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useLayoutEffect, useRef, useState } from "react";

/** Rows that fit the 240 px body (§4.3), each 38 tall with its separator. */
const ROWS_IN_VIEW = 6;

interface FrameProps {
  /** The verb the widget draws, for `data-widget`. */
  verb: string;
  icon: LucideIcon;
  title: string;
  meta?: string | undefined;
  language: Language;
  /** How many things the body holds, for "Pokaż wszystkie ({n})". */
  count: number;
  children: ReactNode;
}

function Header({
  icon: Icon,
  title,
  meta,
}: Pick<FrameProps, "icon" | "title" | "meta">): ReactElement {
  return (
    <header className="flex min-w-0 items-center gap-2 border-b-jw border-jw-line px-3.5 py-2.5">
      <Icon aria-hidden className="size-4 shrink-0 text-jw-ink" />
      <h3 className="min-w-0 truncate text-jw-page-body font-semibold text-jw-ink" data-title>
        {title}
      </h3>
      {meta !== undefined && (
        <span
          className="min-w-0 truncate text-jw-page-small text-jw-ink-soft tabular-nums"
          data-meta
        >
          {meta}
        </span>
      )}
    </header>
  );
}

function ShowAll({
  language,
  count,
  onClick,
}: {
  language: Language;
  count: number;
  onClick: () => void;
}): ReactElement {
  return (
    <Button
      variant="ghost"
      className="h-7 w-full justify-start rounded-none border-t-jw border-jw-line px-3.5 text-jw-page-small text-jw-ink-soft"
      onClick={onClick}
      data-show-all
    >
      {copy(language, "chat_show_all", { n: count }, "adult")}
    </Button>
  );
}

const SECTION =
  "flex flex-col overflow-hidden rounded-jw-card border-jw border-jw-line bg-jw-card text-jw-page-body text-jw-ink";

/** A widget whose body is rows: the first ROWS_IN_VIEW, then the rest behind "Pokaż wszystkie". */
export function RowsFrame({
  rows,
  ...frame
}: Omit<FrameProps, "children" | "count"> & {
  rows: readonly { key: string; element: ReactElement }[];
}): ReactElement {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, ROWS_IN_VIEW);
  return (
    <section data-widget={frame.verb} aria-label={frame.title} className={SECTION}>
      <Header icon={frame.icon} title={frame.title} meta={frame.meta} />
      <ul className="flex flex-col divide-y divide-jw-line" data-rows>
        {shown.map((r) => (
          <li key={r.key} className="px-3.5 py-2.25">
            {r.element}
          </li>
        ))}
      </ul>
      {!all && rows.length > ROWS_IN_VIEW && (
        <ShowAll language={frame.language} count={rows.length} onClick={() => setAll(true)} />
      )}
    </section>
  );
}

/** A widget with a free body, clamped to 240 px; "Pokaż wszystkie" shows when it overflows. */
export function BodyFrame({ children, count, ...frame }: FrameProps): ReactElement {
  const body = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  const [all, setAll] = useState(false);
  useLayoutEffect(() => {
    const el = body.current;
    if (el !== null && !all) setOver(el.scrollHeight > el.clientHeight + 1);
  });
  return (
    <section data-widget={frame.verb} aria-label={frame.title} className={SECTION}>
      <Header icon={frame.icon} title={frame.title} meta={frame.meta} />
      <div
        ref={body}
        className={all ? "px-3.5 py-2.25" : "max-h-60 overflow-hidden px-3.5 py-2.25"}
        data-body
      >
        {children}
      </div>
      {!all && over && (
        <ShowAll language={frame.language} count={count} onClick={() => setAll(true)} />
      )}
    </section>
  );
}
