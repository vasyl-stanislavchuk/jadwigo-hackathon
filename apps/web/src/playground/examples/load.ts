/**
 * The playground's written examples, read from `GET /api/v1/playground-examples/{language}`
 * through packages/api-client (dl-w3.75). One read per language, kept for the page's life, so
 * switching back to a language draws at once. A failed read is forgotten, so the next page tries
 * again.
 */

import { createClient, type PlaygroundClient } from "@jadwigo/api-client";
import type { LessonQuestion, PlaygroundExamples, QuestionType } from "@jadwigo/contracts";
import type { Language } from "@jadwigo/copy";
import { createContext, useContext, useEffect, useState } from "react";
import type { WrittenExample, WrittenQuestion } from "./types.ts";

export type Examples =
  | { readonly kind: "loading" }
  | { readonly kind: "failed" }
  | { readonly kind: "ready"; readonly examples: readonly WrittenExample[] };

/** The API the playground reads: the page's own origin, or a test's fake. */
export const PlaygroundApi = createContext<PlaygroundClient | null>(null);

let pageClient: PlaygroundClient | null = null;
const read = new WeakMap<PlaygroundClient, Map<Language, Promise<readonly WrittenExample[]>>>();
const held = new WeakMap<PlaygroundClient, Map<Language, readonly WrittenExample[]>>();

function questionOf(q: LessonQuestion): WrittenQuestion {
  return {
    question_type: q.question_type,
    family: q.family,
    say: q.say,
    data: q.data,
    key: q.key,
    help: q.help,
  };
}

/** A reply's examples in the shape the panels play, each joined to its question and twin. */
function writtenOf({ examples, questions }: PlaygroundExamples): WrittenExample[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return examples.flatMap((e) => {
    const question = byId.get(e.lesson_question_id);
    if (question === undefined) return [];
    const twin = e.twin === null ? undefined : byId.get(e.twin);
    return [
      {
        id: e.slug,
        label: e.label,
        ...(e.showcase ? { showcase: true } : {}),
        question: questionOf(question),
        ...(twin === undefined ? {} : { twin: questionOf(twin) }),
        scenarios: e.scenarios.map((s) => ({
          try: s.try,
          value: s.value,
          outcome: s.outcome,
          mistake_class: s.mistake_class,
          marks: s.marks,
        })),
      },
    ];
  });
}

/** A language's examples, read once per client. Resolves to them, or rejects when the read failed. */
export function loadExamples(
  client: PlaygroundClient,
  language: Language,
): Promise<readonly WrittenExample[]> {
  const reads = read.get(client) ?? new Map<Language, Promise<readonly WrittenExample[]>>();
  read.set(client, reads);
  const known = reads.get(language);
  if (known) return known;
  const pending = client.playgroundExamples(language).then(
    (reply) => {
      const out = writtenOf(reply);
      const kept = held.get(client) ?? new Map<Language, readonly WrittenExample[]>();
      kept.set(language, out);
      held.set(client, kept);
      return out;
    },
    (error: unknown) => {
      reads.delete(language);
      throw error;
    },
  );
  reads.set(language, pending);
  return pending;
}

function useClient(): PlaygroundClient {
  const given = useContext(PlaygroundApi);
  if (given) return given;
  pageClient ??= createClient({ base: "" });
  return pageClient;
}

/** What has been read for a language so far. */
function heldFor(client: PlaygroundClient, language: Language): Examples {
  const examples = held.get(client)?.get(language);
  return examples ? { kind: "ready", examples } : { kind: "loading" };
}

/** The examples in `language`: at once when already read, else loading, then ready or failed. */
export function useExamples(language: Language): Examples {
  const client = useClient();
  const [state, setState] = useState<{ language: Language; examples: Examples }>(() => ({
    language,
    examples: heldFor(client, language),
  }));
  useEffect(() => {
    let alive = true;
    loadExamples(client, language).then(
      (examples) => {
        if (alive) setState({ language, examples: { kind: "ready", examples } });
      },
      () => {
        if (alive) setState({ language, examples: { kind: "failed" } });
      },
    );
    return () => {
      alive = false;
    };
  }, [client, language]);
  // A language switch draws what is held for the new one until its read settles.
  return state.language === language ? state.examples : heldFor(client, language);
}

/** A question type's examples, its showcase first. */
export function examplesFor(
  examples: readonly WrittenExample[],
  questionType: QuestionType,
): WrittenExample[] {
  const own = examples.filter((e) => e.question.question_type === questionType);
  return [...own.filter((e) => e.showcase === true), ...own.filter((e) => e.showcase !== true)];
}
