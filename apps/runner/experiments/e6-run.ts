/**
 * Experiment E6 (dl-5ssh.90.53.8): the cost of one lesson.
 *
 * Three invented grade-2/3 homework worksheets (worksheets/*.html, rendered by render.sh; no
 * child's work, no real names) go photo -> lesson through the product path on this machine:
 * a parent message with a JPEG attachment is accepted as the API accepts it (`acceptMessage`),
 * then drained by the runner's own host parts (`postgresEngineHost` + `liveMuse`, the product
 * model muse-spark-1.3-contributor) against the local jadwigo database. The one stand-in is
 * the photo reader: on prod the bytes come from the S3 uploads bucket (`src/attachments.ts`),
 * here from the worksheet file; the bytes the model reads are the same JPEG either way.
 * A JPEG needs no converter (jadwigo-ai `files.ts` sends it as it is).
 *
 * Per worksheet it records: wall time, the run's Muse cost and tokens from its
 * `model_response` events (the rows the Postgres ledger sums by run, dl-z5ja.89), the verbs
 * called, the `lesson_check` findings, the lesson built and its steps; then it plays the
 * lesson once with `@jadwigo/core`'s own judge and the key's solution, as the player grades.
 *
 * Run (never in CI):
 *   set -a; . ~/.config/jadwigo-bank/muse.env; . ~/.config/jadwigo-bank/bank.env; set +a
 *   LOCAL_DATABASE_URL=postgresql://localhost:5433/jadwigo \
 *   JADWIGO_MUSE_CAP_USD=500 JADWIGO_API_URL=$JW_API_URL \
 *   JADWIGO_BANK_READ_TOKEN=$JW_BANK_READ_TOKEN \
 *     bun apps/runner/experiments/e6-run.ts [w1|w2|w3]
 * Writes apps/docs/src/data/experiments/e6.json and /tmp/e6-raw-<worksheet>.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AttachmentId, EventId, ID_PREFIXES, idOf, Uuid } from "@jadwigo/contracts";
import { ConversationId, type RunEvent } from "@jadwigo/contracts/run";
import { acceptMessage, apiBank, fixtureBank, httpBankReads } from "@jadwigo/jadwigo-ai";
import { bankConfig, devDatabaseUrl, museConfig } from "../src/config.ts";
import { postgresEngineHost } from "../src/engine.ts";
import { createHost } from "../src/host.ts";
import { liveMuse, realRuntime } from "../src/muse.ts";
import { apiDeps } from "../src/seed.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

interface Worksheet {
  id: string;
  file: string;
  topic: string;
  grade: number;
  parent_text: string;
}

const WORKSHEETS: Worksheet[] = [
  {
    id: "w1",
    file: "w1-mnozenie.jpg",
    topic: "mnożenie przez 2, 3 i 4",
    grade: 2,
    parent_text:
      "Dziecko ma w 2 klasie taką pracę domową z mnożenia (zdjęcie w załączniku). Zrób z tego lekcję do poćwiczenia w domu.",
  },
  {
    id: "w2",
    file: "w2-ortografia.jpg",
    topic: "ortografia: rz/ż i ó/u",
    grade: 3,
    parent_text:
      "Praca domowa z języka polskiego, 3 klasa: pisownia rz i ż oraz ó i u (zdjęcie w załączniku). Przygotuj lekcję do ćwiczenia.",
  },
  {
    id: "w3",
    file: "w3-zadanie.jpg",
    topic: "zadania tekstowe: zakupy i pieniądze",
    grade: 3,
    parent_text:
      "Zadania tekstowe o zakupach z pracy domowej, 3 klasa (zdjęcie w załączniku). Zrób lekcję na ten temat do ćwiczenia w domu.",
  },
];

/** The S3 reader's local stand-in: the worksheet JPEG behind its pod storage path. */
function fileAttachments(bytes: Uint8Array) {
  return {
    read: (storage_path: string) =>
      Promise.resolve(storage_path.endsWith(".jpg") ? bytes : undefined),
  };
}

function walk(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) walk(v, out);
  else if (typeof value === "object" && value !== null)
    for (const v of Object.values(value)) walk(v, out);
}

function summarise(events: readonly RunEvent[]) {
  let usd = 0;
  let calls = 0;
  const tokens = { input: 0, cached: 0, output: 0 };
  const verbs: string[] = [];
  const types = new Map<string, number>();
  let model = "";
  for (const e of events) {
    types.set(e.type, (types.get(e.type) ?? 0) + 1);
    if (e.type === "model_response") {
      calls++;
      usd += e.payload.cost_usd;
      model = e.payload.model || model;
      tokens.input += e.payload.usage.input_tokens;
      tokens.cached += e.payload.usage.cached_tokens ?? 0;
      tokens.output += e.payload.usage.output_tokens;
      for (const call of e.payload.tool_calls ?? []) verbs.push(call.verb);
    }
  }
  const strings: string[] = [];
  walk(events, strings);
  const lessonIds = [...new Set(strings.filter((s) => /^les_[A-Za-z0-9_-]+$/.test(s)))];
  const versionIds = [...new Set(strings.filter((s) => /^lesv_[A-Za-z0-9_-]+$/.test(s)))];
  const agent_last = events.filter((e) => e.type === "message" && e.payload.from === "agent").at(-1)
    ?.payload.text;
  return {
    model,
    agent_last,
    calls,
    tokens,
    usd: Math.round(usd * 1e6) / 1e6,
    verbs,
    event_types: Object.fromEntries(types),
    lesson_ids: lessonIds,
    version_ids: versionIds,
    turn_ok: types.has("turn_complete") && !types.has("error"),
  };
}

interface CheckFinding {
  level?: string;
  rule?: string;
  step_id?: string;
  text?: string;
}
interface CheckOut {
  ok?: boolean;
  error?: string;
  findings?: CheckFinding[];
  lesson_id?: string;
  play_path?: string;
  questions?: number;
}

/** The lesson_check outputs a turn produced, from its own tool_result events, slimmed down. */
export function lessonChecks(events: readonly RunEvent[]): CheckOut[] {
  const found: CheckOut[] = [];
  for (const e of events) {
    if (e.type !== "tool_result" || e.payload.verb !== "lesson_check") continue;
    const out = (e.payload.output ?? {}) as CheckOut;
    if (e.payload.error) {
      found.push({ error: JSON.stringify(e.payload.error).slice(0, 300) });
      continue;
    }
    found.push({
      ok: out.ok,
      lesson_id: out.lesson_id,
      play_path: out.play_path,
      questions: out.questions,
      findings: (out.findings ?? []).map((f) => ({
        level: f.level,
        rule: f.rule,
        step_id: f.step_id,
        text: f.text,
      })),
    });
  }
  return found;
}

/** The lesson file of the turn's last revision: what the parent's card would publish. */
function lastLessonFile(events: readonly RunEvent[]): unknown {
  let file: unknown;
  for (const e of events) if (e.type === "lesson_revision") file = e.payload.lesson_file;
  return file;
}

/**
 * Plays the built lesson once: compiles its draft file as the publish path compiles it
 * (`compileLessonFile`), then answers every planned question with the key's own solution
 * through `@jadwigo/core`'s judge — the grading the player runs. A question with no code
 * judge (explain) is recorded as kept for later, never as a miss.
 */
export async function playLesson(events: readonly RunEvent[]) {
  const file = lastLessonFile(events);
  if (!file) return { error: "the turn built no lesson revision" };
  // Relative paths, not package names: neither is a runner dependency, and this script is
  // run by bun from the worktree, never bundled into the Lambda.
  const { compileLessonFile } = (await import("../../../packages/lesson-import/src/index.ts")) as {
    compileLessonFile: (raw: unknown) => {
      lesson: { id: string; title: string };
      questions: readonly {
        step_id: string;
        role: string;
        question: { family: string; question_type: string };
      }[];
    };
  };
  const core = (await import("../../../packages/core/src/index.ts")) as {
    judge: (q: never, v: unknown) => { correct: boolean };
    solutionOf: (q: never) => unknown;
  };
  const playOne = (question: { family: string; question_type: string }) => {
    try {
      return core.judge(question as never, core.solutionOf(question as never)).correct
        ? "correct"
        : "missed";
    } catch {
      return "kept-for-later (no code judge)";
    }
  };
  let compiled: ReturnType<typeof compileLessonFile> | undefined;
  let compile_error: string | undefined;
  try {
    compiled = compileLessonFile(file);
  } catch (e) {
    compile_error = e instanceof Error ? e.message : String(e);
  }
  if (compiled) {
    const planned = compiled.questions.filter((q) => q.role === "planned");
    return {
      lesson_id: compiled.lesson.id,
      title: compiled.lesson.title,
      steps: planned.length,
      spares: compiled.questions.length - planned.length,
      played: planned.map((q) => ({
        step_id: q.step_id,
        family: q.question.family,
        question_type: q.question.question_type,
        verdict_on_solution: playOne(q.question),
      })),
    };
  }
  // The draft does not compile (itself an E6 finding: lesson_check reported it and the card
  // was still presented). Play the file's own steps directly, and say compile failed.
  const f = file as {
    title?: string;
    script?: {
      parts?: {
        steps?: {
          id: string;
          question_type: string;
          question?: { family: string; data: unknown; key: unknown; help?: unknown };
        }[];
      }[];
    };
  };
  const steps = (f.script?.parts ?? []).flatMap((p) => p.steps ?? []);
  return {
    title: f.title,
    compile_error,
    steps: steps.length,
    played: steps.map((s) => ({
      step_id: s.id,
      family: s.question?.family,
      question_type: s.question_type,
      verdict_on_solution: s.question
        ? playOne({ ...s.question, question_type: s.question_type })
        : "no question on the step",
    })),
  };
}

async function runWorksheet(w: Worksheet, url: string) {
  const bytes = new Uint8Array(readFileSync(join(HERE, "worksheets", w.file)));
  const api = apiDeps(url);
  const muse = await museConfig();
  const bank = await bankConfig(() =>
    Promise.reject(new Error("e6 reads no SSM: set JADWIGO_BANK_READ_TOKEN")),
  ).catch(() => undefined);
  const host = createHost(async () =>
    postgresEngineHost(
      url,
      (store) => liveMuse(muse, realRuntime, store),
      (line) => process.stdout.write(`${line}\n`),
      muse.tier,
      fileAttachments(bytes),
      undefined,
      bank === undefined ? fixtureBank() : apiBank(httpBankReads(bank)),
    ),
  );
  try {
    const member = await api.store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
    const conversation = await api.store.createConversation(member.pod, {
      id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
      created_by: member.account,
      title: null,
    });
    const attachment_id = AttachmentId.parse(idOf(ID_PREFIXES.attachment, crypto.randomUUID()));
    const started = Date.now();
    const { run } = await acceptMessage(api, {
      pod: member.pod,
      created_by: member.account,
      conversation_id: conversation.id,
      cap_usd: 5,
      entry: {
        event_id: EventId.parse(crypto.randomUUID()),
        kind: "message",
        payload: {
          text: w.parent_text,
          attachments: [
            {
              attachment_id,
              storage_path: `pods/${member.pod}/attachments/${attachment_id}.jpg`,
              media_type: "image/jpeg",
              bytes: bytes.length,
              width: 980,
              height: 880,
            },
          ],
        },
      },
    });
    let events: RunEvent[] = [];
    let outcome = "still running when the drain budget ran out";
    let stale = 0;
    for (let i = 0; i < 300; i++) {
      await host();
      const before = events.length;
      events = await api.store.listRunEvents(member.pod, run.id, 0);
      if (events.some((e) => e.type === "turn_complete")) {
        outcome = "turn_complete";
        break;
      }
      if (events.some((e) => e.type === "error")) {
        outcome = "error event";
        break;
      }
      stale = events.length === before ? stale + 1 : 0;
      if (stale >= 12) {
        outcome = "no new events after 12 drains (step stuck or dead-lettered)";
        break;
      }
    }
    const wall_s = Math.round((Date.now() - started) / 100) / 10;
    writeFileSync(`/tmp/e6-raw-${w.id}.json`, `${JSON.stringify(events, null, 2)}\n`);
    const summary = summarise(events);
    const checks = lessonChecks(events);
    const play = await playLesson(events).catch((e: Error) => ({ error: e.message }));
    const lessonId = checks.at(-1)?.lesson_id ?? summary.lesson_ids.at(-1);
    const lesson = lessonId ? await api.store.getLesson(member.pod, lessonId as never) : undefined;
    return {
      worksheet: w.id,
      topic: w.topic,
      grade: w.grade,
      parent_text: w.parent_text,
      run_id: run.id,
      outcome,
      wall_s,
      bank: bank === undefined ? "fixture" : "api",
      ...summary,
      lesson_check: checks,
      lesson: lesson
        ? { id: lesson.id, title: lesson.title, status: lesson.status, grade: lesson.grade }
        : {
            id: lessonId ?? null,
            stored: false,
            note: "no lesson row yet: the turn ends with a checked draft and its play_path; the row is written when the parent gives the lesson",
          },
      play,
    };
  } finally {
    await api.close();
  }
}

async function main(): Promise<void> {
  const only = process.argv[2];
  const url = devDatabaseUrl();
  const results = [];
  for (const w of WORKSHEETS.filter((x) => !only || x.id === only)) {
    process.stdout.write(`e6: ${w.id} ${w.topic}\n`);
    results.push(await runWorksheet(w, url));
  }
  const out = {
    experiment: "E6: the cost of one lesson (dl-5ssh.90.53.8)",
    ran_at: new Date().toISOString(),
    status: "complete",
    model: results[0]?.model ?? "muse-spark-1.3-contributor",
    calls: results.reduce((n, r) => n + r.calls, 0),
    tokens: {
      input: results.reduce((n, r) => n + r.tokens.input, 0),
      cached: results.reduce((n, r) => n + r.tokens.cached, 0),
      output: results.reduce((n, r) => n + r.tokens.output, 0),
    },
    usd: Math.round(results.reduce((n, r) => n + r.usd, 0) * 1e6) / 1e6,
    cost_source: "ledger",
    wall_s: Math.round(results.reduce((n, r) => n + r.wall_s, 0) * 10) / 10,
    commit: process.argv.find((a) => /^[0-9a-f]{40}$/.test(a)) ?? "unknown",
    commands: [
      "sh apps/runner/experiments/render.sh",
      "set -a; . ~/.config/jadwigo-bank/muse.env; . ~/.config/jadwigo-bank/bank.env; set +a; LOCAL_DATABASE_URL=postgresql://localhost:5433/jadwigo JADWIGO_MUSE_CAP_USD=500 JADWIGO_API_URL=$JW_API_URL JADWIGO_BANK_READ_TOKEN=$JW_BANK_READ_TOKEN bun apps/runner/experiments/e6-run.ts",
    ],
    note: "Invented worksheets only; photo bytes read from the local file in place of S3. Cost and tokens from each run's model_response events, the rows the Postgres ledger sums by run_id (cost_source: ledger). The lesson row is written when the parent gives the lesson; the play compiles the turn's draft file and grades its steps with @jadwigo/core.",
    results,
  };
  const target = join(HERE, "../../../apps/docs/src/data/experiments/e6.json");
  writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify(
      results.map((r) => ({
        w: r.worksheet,
        wall_s: r.wall_s,
        usd: r.usd,
        calls: r.calls,
        verbs: r.verbs,
        turn_ok: r.turn_ok,
        play: r.play,
      })),
      null,
      2,
    )}\n`,
  );
  // The host's pools would keep the process alive; the experiment is done.
  process.exit(0);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`e6: ${error instanceof Error ? error.stack : String(error)}\n`);
    process.exit(1);
  });
}
