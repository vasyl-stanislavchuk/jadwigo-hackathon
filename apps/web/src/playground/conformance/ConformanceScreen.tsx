/**
 * The bank's conformance page, /playground/conformance (dl-a38n.31), dev only: it draws every
 * converted item that plays through the lesson builder's parse and adapter, in pages of BATCH, and
 * runs the builder's render rules (`renderFindings`, lesson/render/rules.ts) on each drawn item in
 * the real DOM. `tools/conformance/run.ts` serves the items at ITEMS_PATH, waits for
 * `window.__jadwigoConformance.done`, and reads the results. It fails closed (dl-a38n.32.1): an
 * item the adapter cannot draw, the page never mounts or whose view throws is an error finding of
 * its own, `render-unplayable`; a batch's pictures settle before the rules run (batch.ts); and with
 * no media URL the page refuses to run, since every picture would read as missing. Before any of
 * that, each item is compiled strictly (`contract`, strict.ts) and its key's own answer judged
 * (`key-grades`, keys.ts, dl-a38n.32.2): a finding of either comes first in the item's findings.
 * Each item is drawn in its own language (dl-a38n.32.3), one lesson file per language; an item
 * that names none the app speaks is `render-unplayable`.
 */

import type { Language } from "@jadwigo/copy";
import { type Finding, parseLessonFileLenient } from "@jadwigo/lesson-import/file";
import {
  type Clock,
  type FamilySpec,
  FamilyView,
  type Instant,
  LessonTheme,
  pageSpec,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { mediaUrl, NO_MEDIA_URL } from "../../media.ts";
import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { checkBatch, unplayable } from "./batch.ts";
import { ItemBoundary } from "./ItemBoundary.tsx";
import {
  type ConvertedItem,
  ITEMS_PATH,
  itemsOf,
  languageOf,
  lessonFileOf,
  plays,
  setIdOf,
} from "./items.ts";
import { keyFindings } from "./keys.ts";
import { compileStrictly } from "./strict.ts";

export const CONFORMANCE_PATH = "/playground/conformance";

/** How many items are drawn at once: enough to be quick, few enough to keep the page light. */
const BATCH = 20;

const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-10-30T00:00:00.000Z" }) };

/** One item's verdict, as the runner reads it. */
interface ItemResult {
  readonly item_id: string;
  readonly set_id: string | null;
  readonly question_type: string | null;
  readonly problem_type: string | null;
  readonly findings: readonly Finding[];
}

/** What the page tells the runner: the results so far, and whether every item is in. */
interface ConformanceState {
  done: boolean;
  total: number;
  results: ItemResult[];
  error?: string;
}

declare global {
  interface Window {
    __jadwigoConformance?: ConformanceState;
  }
}

/** The checks made before an item is drawn: the strict compile, then whether its key grades. */
function compiled(item: ConvertedItem): Finding[] {
  const { question, findings } = compileStrictly(item);
  return question === null ? findings : keyFindings(item.id, question);
}

/** A spec to draw, in the language of the item it came from. */
interface Drawn {
  readonly spec: FamilySpec;
  readonly language: Language;
}

/** Every item that plays, each as a spec to draw or a verdict already reached. */
function prepare(items: readonly ConvertedItem[]): {
  specs: Drawn[];
  early: ItemResult[];
  byId: Map<string, ConvertedItem>;
  before: Map<string, Finding[]>;
} {
  const playing = items.filter(plays);
  const byId = new Map(playing.map((i) => [i.id, i]));
  const before = new Map(playing.map((i) => [i.id, compiled(i)]));
  const specs: Drawn[] = [];
  const early: ItemResult[] = [];
  const byLanguage = new Map<Language, ConvertedItem[]>();
  for (const item of playing) {
    const language = languageOf(item);
    if (language === null) {
      const reason = `its language ${JSON.stringify(item.language ?? null)} is not one the app speaks.`;
      early.push(
        resultOf(item, item.id, [...(before.get(item.id) ?? []), unplayable(item.id, reason)]),
      );
    } else byLanguage.set(language, [...(byLanguage.get(language) ?? []), item]);
  }
  for (const [language, group] of byLanguage) {
    const { file, skipped } = parseLessonFileLenient(lessonFileOf(group, language));
    const steps = lessonFileToSpecs(file, undefined, skipped).flatMap((p) => p.steps);
    for (const step of steps) {
      if (step.kind === "question") specs.push({ spec: step.spec, language });
      else
        early.push(
          resultOf(byId.get(step.step_id), step.step_id, [
            ...(before.get(step.step_id) ?? []),
            unplayable(step.step_id, step.reason),
          ]),
        );
    }
  }
  return { specs, early, byId, before };
}

function resultOf(
  item: ConvertedItem | undefined,
  item_id: string,
  findings: readonly Finding[],
): ItemResult {
  const question_type = item?.spec?.question_type;
  return {
    item_id,
    set_id: item === undefined ? null : setIdOf(item),
    question_type: typeof question_type === "string" ? question_type : null,
    problem_type: item?.problem_type ?? null,
    findings,
  };
}

export function ConformanceScreen(): ReactElement {
  const [prepared, setPrepared] = useState<ReturnType<typeof prepare> | null>(null);
  const [start, setStart] = useState(0);
  const [state, setState] = useState<ConformanceState>({ done: false, total: 0, results: [] });
  const roots = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (mediaUrl() === "") {
      setState({ done: true, total: 0, results: [], error: NO_MEDIA_URL });
      return;
    }
    fetch(ITEMS_PATH)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${ITEMS_PATH}: ${r.status}`))))
      .then((file: unknown) => {
        const ready = prepare(itemsOf(file));
        setPrepared(ready);
        setState({
          done: ready.specs.length === 0,
          total: ready.specs.length + ready.early.length,
          results: ready.early,
        });
      })
      .catch((e: unknown) => setState({ done: true, total: 0, results: [], error: String(e) }));
  }, []);

  const batch = prepared?.specs.slice(start, start + BATCH) ?? [];

  useEffect(() => {
    if (prepared === null) return;
    const drawn = prepared.specs.slice(start, start + BATCH);
    if (drawn.length === 0) return;
    let live = true;
    const ids = drawn.map((d) => d.spec.id);
    void checkBatch(ids, roots.current).then((findings) => {
      if (!live) return;
      const found = ids.map((id) =>
        resultOf(prepared.byId.get(id), id, [
          ...(prepared.before.get(id) ?? []),
          ...(findings.get(id) ?? [unplayable(id, "it was not checked.")]),
        ]),
      );
      const next = start + BATCH;
      setState((s) => ({
        ...s,
        done: next >= prepared.specs.length,
        results: [...s.results, ...found],
      }));
      if (next < prepared.specs.length) setStart(next);
    });
    return () => {
      live = false;
    };
  }, [prepared, start]);

  useEffect(() => {
    window.__jadwigoConformance = state;
  }, [state]);

  const failing = state.results.filter((r) => r.findings.some((f) => f.level === "error")).length;
  return (
    <main className="tool flex flex-col gap-4 p-4" aria-label="Conformance">
      <header className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-semibold text-lg">Conformance</h1>
        <p className="text-muted-foreground text-sm" data-conformance-status>
          {state.error ??
            `${state.results.length} of ${state.total} items checked, ${failing} failing${state.done ? ", done" : ""}`}
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {batch.map(({ spec, language }) => (
          <section
            key={spec.id}
            aria-label={`Item ${spec.id}`}
            className="kid-step min-w-0 rounded-xl border bg-background p-4"
            data-item={spec.id}
            ref={(el) => {
              if (el === null) roots.current.delete(spec.id);
              else roots.current.set(spec.id, el);
            }}
          >
            <ItemBoundary>
              <LessonTheme>
                <FamilyView
                  spec={pageSpec(spec) as never}
                  language={language}
                  category="child"
                  clock={clock}
                  mode={ViewMode.Preview}
                  answerKey={spec.key as never}
                  showKey={false}
                />
              </LessonTheme>
            </ItemBoundary>
          </section>
        ))}
      </div>
    </main>
  );
}
