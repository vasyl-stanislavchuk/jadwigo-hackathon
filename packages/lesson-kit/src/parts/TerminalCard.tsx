/**
 * Part: commands as a shell shows them, each with what it printed (dl-i952.19, variant C of
 * docs/plan/widgets/code-parts.md). The card is dark in both themes (the --code-* tokens), the
 * commands are highlighted by our own bd-aware tokenizer (code.ts), and the output is plain, as
 * a real terminal prints it. A row too long for the card scrolls sideways instead of wrapping
 * mid-token, and only a row that really scrolls is a tab stop (WCAG 2.1.1).
 *
 * Copy follows the host (dl.contracts.spec.copyable): a question stem never offers it, a reveal
 * frame may, and a line holding a <placeholder> never does. That line shows a note to type the id
 * bd printed instead. A copy says "Copied" only once the clipboard write succeeded, and says so in
 * a live region too. Copying is not an answer and records nothing. The card is never read aloud.
 *
 * `paper` is the printed look (print support `adapted`): a border and text in the ink (--jw-ink, so
 * the theme's paper and night grounds both read it), the $ kept, commands and output wrapped between
 * words with a hanging indent, no highlighting colour and no copy.
 */

import { copy, type Language } from "@jadwigo/copy";
import { Button, cn } from "@jadwigo/ui";
import { Check, Copy } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TerminalCard as Card, TerminalLine } from "../stage/types.ts";
import { copyable, copyLabel, hasPlaceholder, type TokenKind, tokens } from "./code.ts";
import "./terminal.css";

/** Colour and a weight or style for each kind, so nothing rests on colour alone (A5). The Grape
 * scheme's secondary (ids) sits close to its primary (verbs) in hue, so an id is regular weight
 * where a verb is semibold: the two read apart by weight as well as colour. */
const KIND: Record<TokenKind, string> = {
  cmd: "font-bold text-[color:var(--code-cmd)]",
  verb: "font-semibold text-[color:var(--code-cmd)]",
  flag: "text-[color:var(--code-flag)]",
  id: "font-normal text-[color:var(--code-id)]",
  str: "",
  path: "italic",
  op: "text-[color:var(--code-muted)]",
  ph: "rounded-sm bg-[color:var(--code-placeholder)] italic text-[color:var(--code-placeholder-foreground)] outline-1 -outline-offset-1 outline-dashed outline-[color:var(--code-muted)]",
  arg: "",
};

const COPIED_MS = 2000;
// The live region is cleared, then set this long after, so a second copy is announced again.
const ANNOUNCE_MS = 100;

/** Copy a command; true only when the write really happened. The fallback selects a hidden
 * textarea, then hands focus back to whatever held it (the copy button). */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const held = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const area = document.createElement("textarea");
    try {
      area.value = text;
      area.setAttribute("readonly", "");
      document.body.append(area);
      area.select();
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area.remove();
      held?.focus();
    }
  }
}

/** A row that scrolls sideways; focusable only while its content is wider than it. */
function ScrollRow({
  label,
  paper,
  className,
  children,
}: {
  label: string;
  paper: boolean;
  className?: string | undefined;
  children: ReactNode;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || paper) return;
    const measure = () => setScrolls(el.scrollWidth > el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [paper]);
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      tabIndex={scrolls ? 0 : undefined}
      data-scrolls={scrolls || undefined}
      className={cn(
        paper
          ? "whitespace-pre-wrap py-1 pr-3 pl-[3ch] -indent-[2ch]"
          : "kid-terminal-scroll overflow-x-auto whitespace-pre px-4 py-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Command({ cmd, paper }: { cmd: string; paper: boolean }): JSX.Element {
  return (
    <>
      <span aria-hidden="true" className="mr-[1ch] select-none text-[color:var(--code-muted)]">
        $
      </span>
      {tokens(cmd).map(([text, kind], index) =>
        kind === null ? (
          <Fragment key={index}>{text}</Fragment>
        ) : (
          <span
            key={index}
            data-token={kind}
            className={cn(
              "whitespace-nowrap",
              !paper && KIND[kind],
              paper && kind === "ph" && "underline decoration-dashed",
            )}
          >
            {text}
          </span>
        ),
      )}
    </>
  );
}

type Status = { line: number; ok: boolean } | null;

export function TerminalCard({
  card,
  language,
  paper = false,
}: {
  card: Card;
  language: Language;
  paper?: boolean | undefined;
}): JSX.Element {
  const [status, setStatus] = useState<Status>(null);
  const [announced, setAnnounced] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Each copy's number: a copy that resolves after a newer one started is dropped.
  const seq = useRef(0);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (say.current) clearTimeout(say.current);
    },
    [],
  );

  const onCopy = async (index: number, line: TerminalLine) => {
    const mine = ++seq.current;
    const ok = await writeClipboard(line.cmd);
    if (mine !== seq.current) return;
    if (timer.current) clearTimeout(timer.current);
    if (say.current) clearTimeout(say.current);
    setStatus({ line: index, ok });
    setAnnounced("");
    say.current = setTimeout(
      () => setAnnounced(copy(language, ok ? "code_copied" : "code_copy_failed")),
      ANNOUNCE_MS,
    );
    if (ok)
      timer.current = setTimeout(() => {
        setStatus(null);
        setAnnounced("");
      }, COPIED_MS);
  };

  return (
    <div
      role="group"
      aria-label={copy(language, "code_terminal")}
      data-terminal=""
      data-paper={paper || undefined}
      // Only the card's own status region speaks: a live list around it (a reveal's frames)
      // must not announce the button's "Copied" a second time.
      aria-live="off"
      className={cn(
        "overflow-hidden rounded-lg border font-mono text-lg leading-[1.55]",
        paper
          ? "break-inside-avoid border-jw-ink text-jw-ink"
          : "border-[color:var(--code-border)] bg-[color:var(--code-surface)] text-[color:var(--code-text)] [--ring:var(--code-ring)]",
      )}
    >
      {card.lines.map((line, index) => {
        const offer = !paper && copyable(card, line);
        const copied = status?.line === index && status.ok;
        return (
          <Fragment key={index}>
            <div
              data-line={index}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center",
                !paper && "min-h-[var(--kid-tap-min)]",
              )}
            >
              <ScrollRow label={copy(language, "code_command")} paper={paper}>
                <Command cmd={line.cmd} paper={paper} />
              </ScrollRow>
              {offer ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={copy(language, "code_copy", { cmd: copyLabel(line.cmd) })}
                  data-copy={index}
                  data-copied={copied || undefined}
                  onClick={() => void onCopy(index, line)}
                  className={cn(
                    // The 56 px box stays the tap target (A2); the visible hover and focus
                    // fill is a pill inset from it, so it never fills the row or runs into
                    // the card's rounded corner (owner, 2026-10-08).
                    "relative isolate mx-1 gap-1.5 border-0 bg-transparent px-3 font-sans text-jw-small hover:bg-transparent [&_svg:not([class*=size-])]:size-6",
                    "before:absolute before:inset-x-1.5 before:inset-y-2 before:-z-10 before:rounded-sm before:transition-colors hover:before:bg-[color:var(--code-hover)] focus-visible:before:bg-[color:var(--code-hover)]",
                    copied
                      ? "text-[color:var(--code-cmd)]"
                      : "text-[color:var(--code-muted)] hover:text-[color:var(--code-cmd)]",
                  )}
                >
                  {copied ? (
                    <>
                      <Check aria-hidden="true" />
                      <span>{copy(language, "code_copied")}</span>
                    </>
                  ) : (
                    <Copy aria-hidden="true" />
                  )}
                </Button>
              ) : (
                <span />
              )}
            </div>
            {hasPlaceholder(line.cmd) && (
              <p
                data-placeholder-note=""
                className={cn(
                  "px-4 pb-2 font-sans text-jw-small",
                  !paper && "text-[color:var(--code-muted)]",
                )}
              >
                {copy(language, "code_placeholder")}
              </p>
            )}
            {status?.line === index && !status.ok && (
              <p data-copy-failed="" className="px-4 pb-2 font-sans text-jw-small">
                {copy(language, "code_copy_failed")}
              </p>
            )}
            {line.out && line.out.length > 0 && (
              <ScrollRow
                label={copy(language, "code_output")}
                paper={paper}
                className={paper ? "pl-[3ch] indent-0" : "pb-3"}
              >
                {line.out.map((text, row) => (
                  <div key={row} className={cn(paper && "pl-[2ch] -indent-[2ch]")}>
                    {paper
                      ? text.split(/(\s+)/).map((word, w) =>
                          /^\s+$/.test(word) ? (
                            word
                          ) : (
                            <span key={w} className="whitespace-nowrap">
                              {word}
                            </span>
                          ),
                        )
                      : text}
                  </div>
                ))}
              </ScrollRow>
            )}
          </Fragment>
        );
      })}
      {!paper && (
        <p role="status" aria-live="polite" className="sr-only">
          {announced}
        </p>
      )}
    </div>
  );
}
