/**
 * The example as data, the way tooling sees it: what the page receives (the key stripped), what the
 * server holds back (the key), the twin, the written scenarios (each value, its outcome, its class
 * and its marks), and what the validator thinks of the question. All of it in the shapes
 * packages/contracts holds, resolved to the language on show.
 */

import type { Language } from "@jadwigo/copy";
import { type FamilySpec, pageSpec, validate } from "@jadwigo/lesson-kit";
import type { ReactElement, ReactNode } from "react";
import type { WrittenExample } from "../examples/index.ts";
import { resolve } from "../localize.ts";
import { Badge } from "../tool/badge.tsx";
import { scenariosIn } from "./question.ts";

function Block({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-col gap-2 rounded-2xl border bg-card p-4"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted-foreground text-xs">{hint}</p>
      {children}
    </section>
  );
}

const Json = ({ value }: { value: unknown }): ReactElement => (
  <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
    {JSON.stringify(value, null, 2)}
  </pre>
);

export function DataPanel({
  example,
  spec,
  language,
}: {
  example: WrittenExample;
  spec: FamilySpec;
  language: Language;
}): ReactElement {
  const problems = validate(spec);
  const { help, ...question } = spec;
  const { twin, ...ladder } = help ?? {};
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Block title="What the page gets" hint="The question without its key or its help ladder.">
        <Json value={pageSpec(spec)} />
      </Block>
      <Block
        title="What the server keeps"
        hint="The key, in the shape of the answer, and the help ladder, released a rung at a time."
      >
        <Json value={{ key: question.key, ...(help === undefined ? {} : { help: ladder }) }} />
      </Block>
      {twin !== undefined && (
        <Block title="The twin" hint="Help rung 4: a question of its own, answered alone.">
          <Json value={twin} />
        </Block>
      )}
      <Block
        title="Checks"
        hint="lesson-kit validate: what the authoring lint will say about this question."
      >
        {problems.length === 0 ? (
          <p className="text-sm">No problems.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm" data-problems>
            {problems.map((p) => (
              <li key={`${p.path}|${p.rule}|${p.message}`}>
                <Badge variant={p.level === "error" ? "default" : "secondary"}>{p.level}</Badge>{" "}
                <span className="font-mono text-xs">{p.rule}</span> {p.message}
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block
        title="Each scenario, as written"
        hint="The value it commits, what it shows and the marks the page is told. Nothing here is judged."
      >
        <Json
          value={scenariosIn(example, language).map((s) => ({
            try: resolve(s.try, language),
            value: resolve(s.value, language),
            outcome: s.outcome,
            mistake_class: s.mistake_class,
            marks: s.marks,
          }))}
        />
      </Block>
    </div>
  );
}
