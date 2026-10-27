/**
 * Part: a lesson string with its light markdown and TeX drawn (dl-r772.6). richText.ts parses it
 * and richTextMacros.ts calls KaTeX; this draws the result. Paragraphs, Perseus tables, bullet
 * lists and images are blocks; bold, inline code (the same chips as InlineCode), TeX and slots are
 * runs. A glossary term (dl-w3.56) is a Term part: the word, with its meaning drawn through
 * RichText again inside the popover. In `inline` mode the runs sit in the host's own element, as
 * InlineCode does, so an option, a card or a gap label keeps its size and its colour from the host.
 *
 * Formulas follow the lesson frame's rule 17: × = + − are text in the lesson's face and a formula
 * never breaks across lines, so a TeX span of numbers and signs alone is drawn as text on one line.
 * KaTeX draws the rest (fractions, powers, roots), in Andika (stage.css).
 *
 * KaTeX's output is the only HTML set from a string, and KaTeX escapes its input; no markdown HTML
 * is ever rendered. Sizes come from the host and the tokens: KaTeX draws in em, so maths scales
 * with the text around it.
 */

import "katex/dist/katex.min.css";
import { cn } from "@jadwigo/ui";
import { Fragment, type ReactNode } from "react";
import { gapFit, rem, usePhoneCells } from "./gapFit.ts";
import { CodeChip } from "./InlineCode.tsx";
import { notationTex, notationText, useNotation } from "./notation.ts";
import { renderTex, texWords } from "./richTextMacros.ts";
import { type Block, type Inline, parseInline, parseRichText } from "./richTextParse.ts";
import { Term } from "./Term.tsx";

export interface RichTextProps {
  text: string;
  /** Runs only, in the host's element: no paragraph, so a bold word or a `$…$` sits in a sentence. */
  inline?: boolean | undefined;
  /** Every TeX span drawn as display maths, for a figure that is the maths. */
  display?: boolean | undefined;
  /** What a `{id}` marker draws. Only the ids in `slotIds` are slots (every well-formed marker
   * when `slotIds` is not given); a marker outside them, or inside TeX, is plain text. */
  slots?: ((id: string) => ReactNode) | undefined;
  slotIds?: ReadonlySet<string> | undefined;
  /** The printed look for code chips. */
  paper?: boolean | undefined;
  className?: string | undefined;
}

/** TeX that is only numbers and signs, with the macros that name a sign: drawn as text. A letter,
 * a brace or any other macro (a variable, a colour, a fraction) leaves it to KaTeX. */
const PLAIN_TEX =
  /^(?:[\d \t\n.,:?!()<>=+\-−×·÷]|\{,\}|\\(?:times|cdot|div|,|;|mathbin\{:\})(?![A-Za-z]))*$/;
const PLAIN_SIGNS: Record<string, string> = {
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\mathbin{:}": ":",
  "\\,": " ",
  ";": " ",
  "{,}": ",",
};

/** The text a plain TeX span reads as, or null when it needs KaTeX. */
export function plainTex(tex: string): string | null {
  if (!PLAIN_TEX.test(tex)) return null;
  const text = tex
    .replace(/[ \t\n]+/g, "")
    .replace(/\\(?:times|cdot|div|mathbin\{:\}|,|;)|\{,\}/g, (m) => PLAIN_SIGNS[m] ?? m)
    .replace(/-/g, "−");
  // TeX ignores spaces: a sign between two terms takes one on each side, as in the lesson's text.
  return text.replace(/(?<=[\d)])([=+−×·÷:<>])(?=[\d(−])/g, " $1 ");
}

function Tex({ tex: written, display }: { tex: string; display: boolean }): JSX.Element {
  // A Polish lesson draws numbers and signs the school's way (notation.ts).
  const tex = notationTex(written, useNotation());
  const plain = display ? null : plainTex(tex);
  if (plain !== null)
    return (
      <span role="math" aria-label={texWords(tex)} data-tex="inline" data-formula>
        {plain}
      </span>
    );
  // eslint-disable-next-line react/no-danger -- KaTeX output only; KaTeX escapes its input.
  // KaTeX's HTML is aria-hidden, so the span names the maths itself (texWords) for a screen reader.
  return (
    <span
      role="math"
      aria-label={texWords(tex)}
      data-tex={display ? "display" : "inline"}
      dangerouslySetInnerHTML={{ __html: renderTex(tex, display) }}
    />
  );
}

type Run = Inline | { kind: "word"; runs: Inline[] };

/**
 * The runs with each slot that touches a word (`mr{g1}z`) gathered with that word's letters into
 * one `word` run, so a line never breaks between the letters and the gap and the gap stays in its
 * word (dl-w3.68.24). A slot with a space on both sides is left as it is.
 */
function glued(runs: Inline[]): Run[] {
  const out: Run[] = [];
  let word: Inline[] | null = null;
  const close = () => {
    const [only] = word ?? [];
    if (word !== null) out.push(word.length === 1 && only ? only : { kind: "word", runs: word });
    word = null;
  };
  runs.forEach((r, i) => {
    if (r.kind === "slot") {
      if (word === null) word = [];
      word.push(r);
      return;
    }
    if (r.kind !== "text") {
      close();
      out.push(r);
      return;
    }
    let text = r.text;
    if (word !== null) {
      const head = /^\S*/.exec(text)?.[0] ?? "";
      if (head !== "") word.push({ kind: "text", text: head });
      text = text.slice(head.length);
      if (text === "") return;
      close();
    }
    const tail = runs[i + 1]?.kind === "slot" ? (/\S*$/.exec(text)?.[0] ?? "") : "";
    if (text.length > tail.length)
      out.push({ kind: "text", text: text.slice(0, text.length - tail.length) });
    if (tail !== "") word = [{ kind: "text", text: tail }];
  });
  close();
  return out;
}

const LETTER = /\p{L}/u;

/** Whether the run at `i`, a slot, has a letter right against it: a gap inside a word (`st{g1}ł`),
 * not a whole word with a full stop after it (`{g2}.`). */
function inWord(runs: Inline[], i: number): boolean {
  const before = runs[i - 1];
  const after = runs[i + 1];
  return (
    (before?.kind === "text" && LETTER.test(before.text.slice(-1))) ||
    (after?.kind === "text" && LETTER.test(after.text.slice(0, 1)))
  );
}

/** A cell two letters wide, 60 on a laptop and 56 on a phone, 64 tall (Slots addendum 3.2,
 * dl-uukj.29.124), for a gap inside a word: no space either side, so "st[ó]ł" reads as one word,
 * and always two letters wide, so ó, u, rz, ż or ch never shows its length. The gap fills it
 * (gapFit.ts), which also takes off the margin a word's gap keeps round its focus ring
 * (dl-w3.68.24). */
function WordCell({ children }: { children: ReactNode }): JSX.Element {
  const width = rem(usePhoneCells() ? 56 : 60);
  const height = rem(64);
  return (
    <span
      data-in-word
      className="inline-flex items-center justify-center align-middle"
      style={{ width, height, ...gapFit(width, height) }}
    >
      {children}
    </span>
  );
}

function Runs({
  runs,
  props,
  word = false,
}: {
  runs: Inline[];
  props: RichTextProps;
  word?: boolean | undefined;
}): JSX.Element {
  const slot = (id: string): ReactNode => props.slots?.(id) ?? `{${id}}`;
  const language = useNotation();
  return (
    <>
      {(word ? runs : glued(runs)).map((r, i) => {
        if (word && r.kind === "slot" && props.slots !== undefined && inWord(runs, i))
          return <WordCell key={i}>{slot(r.id)}</WordCell>;
        switch (r.kind) {
          case "word":
            return (
              <span key={i} data-word className="whitespace-nowrap">
                <Runs runs={r.runs} props={props} word />
              </span>
            );
          case "text":
            return <Fragment key={i}>{notationText(r.text, language)}</Fragment>;
          case "break":
            return <br key={i} />;
          case "bold":
            return (
              <strong key={i}>
                <Runs runs={r.runs} props={props} />
              </strong>
            );
          case "italic":
            return (
              <em key={i}>
                <Runs runs={r.runs} props={props} />
              </em>
            );
          case "code":
            return <CodeChip key={i} text={r.text} paper={props.paper} />;
          case "tex":
            return <Tex key={i} tex={r.tex} display={r.display || props.display === true} />;
          case "slot":
            return <Fragment key={i}>{slot(r.id)}</Fragment>;
          case "term":
            return (
              <Term
                key={i}
                paper={props.paper}
                word={<Runs runs={parseInline(r.word)} props={props} />}
                meaning={<RichText inline text={r.meaning} paper={props.paper} />}
              />
            );
        }
        return null;
      })}
    </>
  );
}

const CELL = "border border-border px-3 py-1 text-left align-top";

function BlockView({ block, props }: { block: Block; props: RichTextProps }): JSX.Element {
  switch (block.kind) {
    case "paragraph":
      return (
        <p>
          <Runs runs={block.runs} props={props} />
        </p>
      );
    case "list":
      return (
        <ul className="list-disc pl-6">
          {block.items.map((item, i) => (
            <li key={i}>
              <Runs runs={item} props={props} />
            </li>
          ))}
        </ul>
      );
    case "image":
      return <img src={block.src} alt={block.alt} className="max-w-full rounded-lg" />;
    case "table":
      return (
        <table className="border-collapse">
          {block.header && (
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i} scope="col" className={cn(CELL, "font-semibold")}>
                    <Runs runs={cell} props={props} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className={CELL}>
                    <Runs runs={cell} props={props} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

/** Every well-formed marker is a slot when a callback is given with no id set. */
const ANY_ID: ReadonlySet<string> = {
  has: () => true,
  size: Infinity,
} as unknown as ReadonlySet<string>;

function slotSet(props: RichTextProps): ReadonlySet<string> | undefined {
  if (props.slotIds) return props.slotIds;
  return props.slots ? ANY_ID : undefined;
}

export function RichText(props: RichTextProps): JSX.Element {
  const { text, inline = false, className } = props;
  const blocks = parseRichText(text, { slots: slotSet(props) });
  if (inline) {
    // Paragraphs apart by a break; a table, list or image in an inline host still draws as itself.
    const body = blocks.map((b, i) => (
      <Fragment key={i}>
        {i > 0 && <br />}
        {b.kind === "paragraph" ? (
          <Runs runs={b.runs} props={props} />
        ) : (
          <BlockView block={b} props={props} />
        )}
      </Fragment>
    ));
    return className ? <span className={className}>{body}</span> : <>{body}</>;
  }
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} props={props} />
      ))}
    </div>
  );
}
