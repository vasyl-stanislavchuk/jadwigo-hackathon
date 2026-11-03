// Experiment E3 (dl-5ssh.90.53.5): load the E1 cohort into the LOCAL jadwigo database.
//   DATABASE_URL=postgresql://localhost:5433/jadwigo bun apps/api/src/experiments/e3-load.ts
// It refuses any non-local jadwigo* database, plays every E1 attempt through the Store as the
// API plays one, and prints {label, profile, learner_id, pod_id} as JSON. Invented learners only.
import { EventId, SkillId, Uuid } from "@jadwigo/contracts";
import { createPostgresStore, type NewAttemptAnswer, type Store } from "@jadwigo/store";
import { databaseUrl } from "../config.ts";
import { buildCohort } from "./e1.ts";

const LOCAL =
  /^postgres(ql)?:\/\/([A-Za-z0-9._~%+=:-]+@)?(localhost|127\.0\.0\.1)(:[0-9]+)?\/jadwigo[A-Za-z0-9_]*$/;

/** Whether `url` names a jadwigo* database on this machine: the only kind E3 may write to. */
export function isLocalDatabase(url: string | undefined): boolean {
  return url !== undefined && LOCAL.test(url);
}

function localUrl(): string {
  const url = databaseUrl();
  if (!isLocalDatabase(url)) {
    throw new Error("DATABASE_URL must name a local jadwigo* database");
  }
  return url as string;
}

/** One E1 learner played into the store: a fresh pod, learner, goal and every attempt. */
async function loadLearner(
  store: Store,
  learner: ReturnType<typeof buildCohort>["learners"][number],
  skills: ReturnType<typeof buildCohort>["skills"],
) {
  return store.unit(async () => {
    const { pod } = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
    const { learner: made } = await store.addLearner(pod, {
      first_name: learner.label,
      goals: [],
    });
    await store.putSkills(
      pod,
      skills.map((s) => ({
        code: s.code,
        topic_id: null,
        kind: s.kind,
        status: s.status,
        can_do: s.can_do,
        aliases: s.aliases,
        prerequisites: s.prerequisites,
        source: s.source,
      })),
    );
    await store.addGoal(pod, made.id, {
      name: "Multiplication and spelling, grades 2-3 (synthetic)",
      lesson_language: "pl",
      skill_codes: skills.map((s) => s.code),
    });
    const questionBySkill = new Map<string, string[]>();
    const questionFor = (code: string, seen: Map<string, number>): string => {
      const list = questionBySkill.get(code) ?? [];
      const n = seen.get(code) ?? 0;
      seen.set(code, n + 1);
      return list[n % list.length] ?? "";
    };
    const lesson = await store.putLesson(pod, {
      title: "E3 synthetic lesson",
      language: "pl",
      category: "child",
      subject: "math",
      grade: 3,
      skill_ids: [],
    });
    for (const skill of skills) {
      const made3: string[] = [];
      for (let copy = 0; copy < 12; copy++) {
        const q = await store.putLessonQuestion(pod, {
          family: "enter",
          question_type: "production",
          say: "Ile to jest?",
          data: { input: "number", entry: "keypad" },
          key: { accept: ["6"] },
          help: { look: { text: "Policz po kolei." } },
          subject: "math",
          grade: 3,
          skill_ids: [SkillId.parse(skill.code)],
          credit: null,
          based_on: null,
          twin_of: null,
          content_hash: `e3-${skill.code}-${crypto.randomUUID()}`,
        });
        made3.push(q.id);
      }
      questionBySkill.set(skill.code, made3);
    }
    const byAttempt = new Map<string, typeof learner.evidence>();
    for (const row of learner.evidence) {
      const rows = byAttempt.get(row.attempt_id) ?? [];
      rows.push(row);
      byAttempt.set(row.attempt_id, rows);
    }
    for (const rows of byAttempt.values()) {
      const ordered = [...rows].sort((a, b) => a.seq - b.seq);
      const versionSeen = new Map<string, number>();
      const versionIds = ordered.map((r) => questionFor(r.skill_code, versionSeen));
      await store.publishLessonVersion(pod, {
        lesson_id: lesson.id,
        questions: versionIds.map((id) => ({
          lesson_question_id: id as never,
          role: "planned" as const,
        })),
      });
      const assignment = await store.putAssignment(pod, {
        audience: "anyone",
        identity: "pick",
        lesson_id: lesson.id,
        hold_verdicts: false,
      });
      const started = await store.startAttempt(pod, {
        assignment_id: assignment.id,
        learner_id: made.id,
      });
      const attempt = started.attempt.id;
      for (const [i, row] of ordered.entries()) {
        const seq = i + 1;
        if (seq > 1) {
          await store.askQuestion(pod, attempt, {
            lesson_question_id: versionIds[i] as never,
            added: "planned",
            placed: null,
            added_for: null,
          });
        }
        for (let seen = 0; seen < row.help_used; seen++) {
          await store.releaseHelp(pod, attempt, seq, seen);
        }
        const at = Date.parse(row.answered_at);
        const answer: NewAttemptAnswer = {
          event_id: EventId.parse(crypto.randomUUID()),
          attempt_id: attempt,
          seq,
          try_no: 1,
          kind: row.kind,
          value: row.kind === "skip" ? null : { entered: row.correct ? "6" : "7" },
          skip_reason: row.kind === "skip" ? "dont_know" : null,
          latency_ms: row.latency_ms,
          asked_at: new Date(at - row.latency_ms).toISOString(),
          answered_at: row.answered_at,
          correct: row.correct,
          mistake_class: row.mistake_class,
          parts: null,
          judged_by: row.kind === "skip" ? null : "enter@1",
          body_hash: `e3-${crypto.randomUUID()}`,
        };
        if (row.kind === "skip") {
          await store.appendAttemptAnswer(pod, answer, { end: "skipped" });
        } else if (row.correct) {
          await store.appendAttemptAnswer(pod, answer, { end: "correct" });
        } else {
          await store.appendAttemptAnswer(pod, answer);
          await store.appendAttemptAnswer(
            pod,
            {
              ...answer,
              event_id: EventId.parse(crypto.randomUUID()),
              try_no: 2,
              kind: "skip",
              value: null,
              skip_reason: "dont_know",
              latency_ms: 1000,
              asked_at: row.answered_at,
              answered_at: new Date(at + 1000).toISOString(),
              correct: null,
              judged_by: null,
              body_hash: `e3-${crypto.randomUUID()}`,
            },
            { end: "skipped" },
          );
        }
      }
      await store.finishAttempt(pod, attempt);
    }
    return { label: learner.label, profile: learner.profile, learner_id: made.id, pod_id: pod };
  });
}

async function main(): Promise<void> {
  const store = createPostgresStore(localUrl());
  try {
    const { skills, learners } = buildCohort();
    const out = [];
    for (const learner of learners) out.push(await loadLearner(store, learner, skills));
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  } finally {
    await store.close();
  }
}

if (import.meta.main) await main();
