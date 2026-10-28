/**
 * What sits above a family step's answer: the spoken task (`say`, shown as the prompt), and the
 * stem when the step has one: a claim or a task in words, a picture, a terminal card. A stem whose
 * text is the whole task (`text_replaces_say`) is shown instead of `say`, which is then only its
 * spoken form. A stem's prepared clips (dl-w3.68.11) sit under the prompt, as play and slow-play
 * buttons. A picture is at most 40% of the scroll area and opens larger on a tap; beside sound it
 * is a thumbnail at the row's end (PictureSheet.tsx, lesson-frame rule 16). The figure (families/figure.ts) is drawn under the words, and a reference sheet
 * (`stem.reference`) last, folded. Shared by every family view so a task reads the same whatever
 * is asked about it.
 */

import type { ReactNode } from "react";
import { Picture } from "../parts/Picture.tsx";
import { PictureView } from "../parts/PictureSheet.tsx";
import { PlayClip } from "../parts/PlayClip.tsx";
import { CreditRow } from "../parts/QuestionCredit.tsx";
import { RichText } from "../parts/RichText.tsx";
import type { RulerControl } from "../parts/Ruler.tsx";
import { TaskPrompt } from "../parts/TaskPrompt.tsx";
import { TerminalCard } from "../parts/TerminalCard.tsx";
import type { Language } from "../stage/types.ts";
import { FigureView } from "./FigureView.tsx";
import type { Figure } from "./figure.ts";
import type { Stem as StemData, StemReference } from "./stem/model.ts";

/** `figure` is the family's own (Enter, Gaps); a Choose stem carries its figure inside. `ruler`
 * is the Enter play view's hold on a ruler figure (dl-w3.51.4): its position and what moving it does. */
export function Stem({
  say,
  stem,
  figure,
  language,
  paper = false,
  ruler,
  instructionAbove = false,
  cardOnly = false,
  figureAs,
  line,
}: {
  say: string;
  stem?: StemData | undefined;
  figure?: Figure | undefined;
  language: Language;
  paper?: boolean | undefined;
  ruler?: RulerControl | undefined;
  /** Enter addendum 3.1: the instruction stands above a card that holds a figure, a picture or a
   * sound of its own. Without it only a stem's own question text puts it there. */
  instructionAbove?: boolean | undefined;
  /** Draw the card alone: the view draws the instruction itself (Instruction), in the step's stem
   * area, and this card in its answer area, with the field in its maths line. */
  cardOnly?: boolean | undefined;
  /** Drawn in the figure's place: the maths line with the field in it (InlineField.tsx). The card
   * is then the step's scroll target. */
  figureAs?: ReactNode | undefined;
  /** Drawn in the card under the figure: a Choose step's line with its pick in place
   * (choose/model.ts `line`). The instruction then stands above the card. */
  line?: ReactNode | undefined;
}): JSX.Element {
  const drawn = figure ?? stem?.figure;
  const question = stem?.text && !stem.text_replaces_say ? stem.text : null;
  const sound = stem?.audio && !paper ? stem.audio : null;
  // Enter addendum 3.1: when the card holds a figure, a picture or a sound of its own, the spoken
  // task stands above it as the instruction (22 / 19 px), and the card holds only what it shows.
  const ownCard =
    question !== null ||
    line !== undefined ||
    (instructionAbove &&
      (drawn !== undefined ||
        sound !== null ||
        stem?.image !== undefined ||
        (stem?.pictures ?? []).length > 0 ||
        stem?.terminal !== undefined));
  const instruction = instructionOf(say, stem);
  const pictures = [
    ...(stem?.image
      ? [{ alt: stem.image_alt ?? "", node: <img src={stem.image} alt={stem.image_alt ?? ""} /> }]
      : []),
    ...(stem?.pictures ?? []).map((p) => ({
      alt: p.alt,
      node: <Picture src={p.src} alt={p.alt} width={p.width} height={p.height} labels={p.labels} />,
    })),
  ];
  // On paper nothing opens: the pictures are drawn as they are.
  const shown = pictures.map((p, i) =>
    paper ? (
      <span key={i}>{p.node}</span>
    ) : (
      <PictureView key={i} language={language} alt={p.alt} thumb={sound !== null}>
        {p.node}
      </PictureView>
    ),
  );
  // The stage (styles/stage.css): the spoken task as the instruction above the card when the stem
  // carries the question, otherwise the task is the question and sits in the card itself.
  // Instruction and card stand 16 apart, the column's gap (README §2, Enter addendum 3.1).
  return (
    <div className="flex flex-col gap-4">
      {ownCard && !cardOnly && <Instruction say={instruction} />}
      {/* A borrowed question's credit (QuestionCredit.tsx) stands in the instruction's row;
                when the card holds the task itself, alone and right-aligned above it. Never on paper. */}
      {!ownCard && !cardOnly && !paper && <CreditRow />}
      <div
        data-prompt-card
        data-scroll-target={figureAs !== undefined ? "" : undefined}
        className="flex flex-col gap-4"
      >
        {question !== null ? (
          // A question that is one formula (37/100) is maths, at the maths size, centred in its
          // card (addendum 3.3, EnterStep.dc.html; dl-uukj.29.113).
          <RichText
            text={question}
            paper={paper}
            className={
              ONE_FORMULA.test(question)
                ? "text-center text-[length:var(--kid-math-size)] font-bold"
                : "text-[length:var(--kid-answer-size)] font-semibold"
            }
          />
        ) : (
          !ownCard && <TaskPrompt text={instruction} />
        )}
        {sound !== null && (
          <div data-sound-row>
            <PlayClip clip={sound.clip} slow={sound.slow} language={language} />
            {shown.length > 0 && <div className="flex gap-3">{shown}</div>}
          </div>
        )}
        {sound === null && shown.length > 0 && (
          <div className="flex flex-wrap items-start justify-center gap-3">{shown}</div>
        )}
        {stem?.terminal && <TerminalCard card={stem.terminal} language={language} paper={paper} />}
        {figureAs !== undefined ? (
          <div data-figure={drawn?.kind}>{figureAs}</div>
        ) : (
          drawn && <FigureView figure={drawn} language={language} ruler={ruler} />
        )}
        {line}
        {stem?.reference && <Reference reference={stem.reference} paper={paper} />}
      </div>
    </div>
  );
}

/** A question that is a single TeX formula and nothing else. */
const ONE_FORMULA = /^\s*\$[^$]+\$\s*$/;

/** The instruction as the screen shows it: the stem's text when it replaces `say`, else `say`. */
export function instructionOf(say: string, stem?: StemData): string {
  return stem?.text && stem.text_replaces_say ? stem.text : say;
}

/** The spoken task as the instruction above the card (styles/stage.css `[data-instruction]`: 22 px
 * bold on a laptop, 19 on a phone), with a borrowed question's credit at the row's end. A view that draws its own card under it (the Enter view's maths
 * line with the field in it, components/parts/InlineField.tsx) uses it alone. */
export function Instruction({ say }: { say: string }): JSX.Element {
  // A borrowed question's credit sits at the row's right end (CreditRow, source-credit README §1).
  return (
    <CreditRow>
      <div data-instruction>
        <TaskPrompt text={say} />
      </div>
    </CreditRow>
  );
}

/** A reference the learner may open (stem/model.ts StemReference): a native disclosure, so the
 * keyboard opens it with Enter or Space and a screen reader announces it collapsed or expanded.
 * Closed at first, as on Khan; open on paper, where nothing can be tapped. It sits outside the
 * spoken line: the voice never reads it. */
function Reference({
  reference,
  paper,
}: {
  reference: StemReference;
  paper: boolean;
}): JSX.Element {
  return (
    <details
      data-reference
      open={paper || undefined}
      className="rounded-xl border border-border bg-muted/40"
    >
      <summary className="flex min-h-[var(--kid-tap-min)] cursor-pointer items-center rounded-xl px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {reference.prompt}
      </summary>
      <div className="px-4 pb-4">
        <RichText text={reference.text} paper={paper} />
      </div>
    </details>
  );
}
