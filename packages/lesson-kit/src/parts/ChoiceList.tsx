/**
 * Part: a list of lettered choices (dl-0ax3.3), on shadcn's unstyled Questionnaire choice
 * (@shadcn/react). Each option is a label around a radio, so it is one radio group to a screen
 * reader, and where the step frame turns its letter shortcuts on (the built blocks, StepFrame
 * `letters`) they pick an option: the first option answers to A, the second to B, … up to E. A
 * family step has none: its options answer to the number keys (ChoiceGroup.tsx). The focus sits on the label's sr-only radio, never on the label.
 *
 * The arrows move the focus and the pick together, as a radio group does, and wrap; Space picks the
 * focused option (paper-behaviour README §3.3). The arrows are read here, not left to the browser,
 * so every browser steps over a taken option the same way and stamps the pick as a keyboard press.
 *
 * Behaviour, not look: the block decides each option's look (its className) and what a selection
 * means. Which option is selected is the block's state, passed in, never Questionnaire's. Selecting
 * is stamped like any press (press.ts): at pointerdown for a tap, at click for a keyboard or a
 * shortcut. Must sit inside a StepFrame (stage/StepFrame.tsx), which owns the Questionnaire.
 */

import { cn } from "@jadwigo/ui";
import { Questionnaire } from "@shadcn/react/questionnaire";
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
} from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import { type PressModality, press } from "../stage/press.ts";

export interface ChoiceOption {
  value: string;
  /** What the option shows: its letter, a label, a mark. */
  children: ReactNode;
  className?: string | undefined;
  /** data-* attributes the block reads back (data-letter, data-look). */
  data?: Record<`data-${string}`, string> | undefined;
  /** Shown in place but not choosable: an option the help ladder took away (families/help.ts). */
  unavailable?: boolean | undefined;
}

// A click on the label is forwarded by the browser to its radio, so only the radio's click is
// read: that one click comes from a keyboard (Space), a letter shortcut, or a tap's forwarding. A
// tap is already stamped at pointerdown, so the click that follows it is skipped.
const FORWARDED_MS = 1000;

const STEP: Record<string, 1 | -1> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

export function ChoiceList({
  label,
  options,
  selected,
  locked,
  clock,
  onChoose,
  className,
}: {
  label: string;
  options: ChoiceOption[];
  selected: string | null;
  /** Shown but not choosable (the tutor reads, the step is done). */
  locked: boolean;
  clock: Clock;
  onChoose(value: string, at: Instant, modality: PressModality): void;
  className?: string | undefined;
}): JSX.Element {
  const lastTap = useRef<{ value: string; at: number } | null>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = STEP[event.key];
    if (step === undefined || event.altKey || event.ctrlKey || event.metaKey || locked) return;
    const radios = [
      ...event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ];
    const at = radios.indexOf(event.target as HTMLInputElement);
    if (at < 0) return;
    event.preventDefault();
    for (let i = 1; i < radios.length; i++) {
      const n = (at + step * i + radios.length) % radios.length;
      const option = options[n];
      if (option === undefined || option.unavailable) continue;
      radios[n]?.focus();
      onChoose(option.value, clock.now(), "keyboard");
      return;
    }
  };

  return (
    <Questionnaire.Choices
      role="radiogroup"
      aria-label={label}
      aria-disabled={locked || undefined}
      className={className}
      onKeyDown={onKeyDown}
    >
      {options.map((option) => {
        const handlers = press(clock, (at, modality) => {
          if (!locked) onChoose(option.value, at, modality);
        });
        return (
          <Questionnaire.Choice
            key={option.value}
            value={option.value}
            checked={selected === option.value}
            disabled={locked || option.unavailable === true}
            aria-disabled={option.unavailable || undefined}
            // Controlled: the block's state says which is selected, set through onChoose.
            onChange={() => {}}
            className={cn("cursor-pointer select-none", option.className)}
            {...option.data}
            onPointerDown={(event: PointerEvent<HTMLLabelElement>) => {
              if (event.button === 0)
                lastTap.current = { value: option.value, at: event.timeStamp };
              handlers.onPointerDown(event);
            }}
            onClick={(event: MouseEvent<HTMLLabelElement>) => {
              if ((event.target as HTMLElement).tagName !== "INPUT") return;
              const tap = lastTap.current;
              lastTap.current = null;
              if (tap?.value === option.value && event.timeStamp - tap.at < FORWARDED_MS) return;
              handlers.onClick({ detail: 0 });
            }}
          >
            <Questionnaire.ChoiceInput className="sr-only" />
            {option.children}
          </Questionnaire.Choice>
        );
      })}
    </Questionnaire.Choices>
  );
}
