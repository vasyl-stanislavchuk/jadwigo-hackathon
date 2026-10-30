/**
 * The bank's conformance page, /playground/conformance (dl-a38n.31), dev only: it draws every
 * converted item that plays through the lesson builder's parse and adapter, in pages of BATCH, and
 * runs the builder's render rules (`renderFindings`, lesson/render/rules.ts) on each drawn item in
 * the real DOM. `tools/conformance/run.ts` serves the items at ITEMS_PATH, waits for
 * `window.__jadwigoConformance.done`, and reads the results. An item the adapter cannot draw is an
 * error finding of its own, `render-unplayable`, with the adapter's reason.
 */

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
import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { renderFindings } from "../lesson/render/rules.ts";
import { type ConvertedItem, ITEMS_PATH, itemsOf, lessonFileOf, plays, setIdOf } from "./items.ts";

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

/** An item the adapter could not draw: an error, since a copy of it would not draw either. */
function unplayable(item_id: string, reason: string): Finding {
  return {
    step_id: item_id,
    path: "",
    level: "error",
    rule: "render-unplayable",
    text: `The item does not draw: ${reason}`,
    fix: "Convert the item to a question its family draws (its question type, data and key), or leave it out of the bank.",
  };
}

/** Every item that plays, each as a spec to draw or a verdict already reached. */
function prepare(items: readonly ConvertedItem[]): {
  specs: FamilySpec[];
  early: ItemResult[];
  byId: Map<string, ConvertedItem>;
} {
  const playing = items.filter(plays);
  const byId = new Map(playing.map((i) => [i.id, i]));
  const { file, skipped } = parseLessonFileLenient(lessonFileOf(playing));
  const steps = lessonFileToSpecs(file, undefined, skipped).flatMap((p) => p.steps);
  const specs: FamilySpec[] = [];
  const early: ItemResult[] = [];
  for (const step of steps) {
    if (step.kind === "question") specs.push(step.spec);
    else
      early.push(
        resultOf(byId.get(step.step_id), step.step_id, [unplayable(step.step_id, step.reason)]),
      );
  }
  return { specs, early, byId };
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

/** Two frames: the batch is laid out and painted before a rule measures it. */
const painted = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export function ConformanceScreen(): ReactElement {
  const [prepared, setPrepared] = useState<ReturnType<typeof prepare> | null>(null);
  const [start, setStart] = useState(0);
  const [state, setState] = useState<ConformanceState>({ done: false, total: 0, results: [] });
  const roots = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
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
    void painted().then(() => {
      if (!live) return;
      const found = drawn.map((spec) => {
        const root = roots.current.get(spec.id);
        const findings = root === undefined ? [] : renderFindings(root, spec);
        return resultOf(prepared.byId.get(spec.id), spec.id, findings);
      });
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
        {batch.map((spec) => (
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
            <LessonTheme>
              <FamilyView
                spec={pageSpec(spec) as never}
                language="pl"
                category="child"
                clock={clock}
                mode={ViewMode.Preview}
                answerKey={spec.key as never}
                showKey={false}
              />
            </LessonTheme>
          </section>
        ))}
      </div>
    </main>
  );
}
