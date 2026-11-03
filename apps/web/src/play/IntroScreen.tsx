/**
 * A given lesson's first screen (decision
 * 2026-11-03-a-play-link-opens-on-a-first-screen-title-and-question-count-the): the lesson's title
 * and how many questions it holds, then who is playing. With a child in the link, one yes and a
 * quiet "To nie ja"; with none, or after "To nie ja", a name to type and a quiet way to play without
 * one. The name stays on the attempt, so a link shared in a parents' chat keeps who played it, and
 * their own parent can keep it at the end.
 */

import { type AssignmentIntro, type LearnerId, LIMITS } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Button, Heading, Input, Label } from "@jadwigo/ui";
import { type FormEvent, type ReactElement, useId, useState } from "react";
import { Column, KidPage } from "./KidPage.tsx";

/** Who is playing: the link's child, a typed name, or neither. */
export interface Who {
  readonly learner: LearnerId | null;
  readonly playerName: string | null;
}

const QUIET = "text-jw-ink-soft underline underline-offset-4";

export function IntroScreen({
  intro,
  learner,
  language,
  onStart,
}: {
  intro: AssignmentIntro;
  /** The child the link names. */
  learner: LearnerId | null;
  language: Language;
  onStart: (who: Who) => void;
}): ReactElement {
  const named = learner !== null && intro.first_name !== null ? intro.first_name : null;
  const [notThem, setNotThem] = useState(false);
  const [name, setName] = useState("");
  const [missing, setMissing] = useState(false);
  const fieldId = useId();
  const missingId = useId();
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const typed = name.trim();
    if (typed === "") setMissing(true);
    else onStart({ learner: null, playerName: typed });
  };
  const asksName = intro.open && (named === null || notThem);
  return (
    <KidPage>
      <Column data-intro>
        <div className="flex flex-col gap-1">
          <Heading lang={intro.language} data-intro-title>
            {intro.title}
          </Heading>
          {intro.question_count > 0 && (
            <p className="text-jw-instruction text-jw-ink-soft" data-intro-count>
              {copy(language, "play_intro_questions", { n: intro.question_count })}
            </p>
          )}
        </div>
        {asksName ? (
          <form className="flex w-full flex-col items-start gap-4" onSubmit={submit} noValidate>
            <div className="flex w-full max-w-sm flex-col gap-2">
              <Label htmlFor={fieldId}>{copy(language, "play_intro_name")}</Label>
              <Input
                id={fieldId}
                kind="text"
                autoComplete="off"
                maxLength={LIMITS.playerNameChars}
                value={name}
                aria-invalid={missing}
                aria-describedby={missing ? missingId : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  setMissing(false);
                }}
                data-intro-name
              />
              {missing && (
                <p id={missingId} role="status" data-intro-missing>
                  {copy(language, "play_intro_name_missing")}
                </p>
              )}
            </div>
            <Button type="submit" size="commit" className="text-jw-option" data-intro-start>
              {copy(language, "play_intro_start")}
            </Button>
            <Button
              type="button"
              variant="link"
              className={QUIET}
              onClick={() => onStart({ learner: null, playerName: null })}
              data-intro-anonymous
            >
              {copy(language, "play_intro_anonymous")}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <Button
              type="button"
              size="commit"
              className="text-jw-option"
              onClick={() => onStart({ learner, playerName: null })}
              data-intro-yes
            >
              {copy(language, "play_intro_yes", { name: named ?? "" })}
            </Button>
            {intro.open && (
              <Button
                type="button"
                variant="link"
                className={QUIET}
                onClick={() => setNotThem(true)}
                data-intro-not-me
              >
                {copy(language, "play_intro_not_me")}
              </Button>
            )}
          </div>
        )}
      </Column>
    </KidPage>
  );
}
