/**
 * The player against a double of the API (no network): a new tab starts an attempt and keeps its
 * id for a reload, a paused attempt waits on the paused screen and resumes on the same question, a
 * finished one shows the congratulation and the list, and an id the server forgot starts afresh.
 * The review (dl-uukj.30.1): a card opens its question's step, the arrows walk the list, "Wszystkie
 * pytania" goes back, and a reload on a review path opens the same step again.
 */

import {
  ApiError,
  type AssignmentIntroClient,
  type AttemptClient,
  TransientError,
} from "@jadwigo/api-client";
import {
  AssignmentId,
  type AssignmentIntro,
  type AttemptAnswerRequest,
  AttemptAnswerResult,
  AttemptId,
  type AttemptResults,
  AttemptSnapshot,
  LearnerId,
  LessonQuestionId,
  type PageAttemptQuestion,
} from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reviewQuestion } from "../review/fixtures.ts";
import { PlayScreen } from "./PlayScreen.tsx";
import { playPath, reviewPath } from "./route.ts";
import { storedAttempt } from "./storedAttempt.ts";

const ASSIGNMENT = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
const ATTEMPT = AttemptId.parse("att_43007b83dp9w2tnfjxhha74cyq");
const FRESH = AttemptId.parse("att_2h4m8gyw0fb1cvz2nkqw0px8fq");
const AT = "2026-10-28T14:02:06.274Z";
const LQ = LessonQuestionId.parse("lq_2h4m8gyw0fb1cvz2nkqw0px8fq");

const question = (seq: number, ended: PageAttemptQuestion["ended"] = null): unknown => ({
  seq,
  lesson_question_id: "lq_2h4m8gyw0fb1cvz2nkqw0px8fq",
  question_type: "production",
  say: `Ile to jest dwa razy pięć? (${seq})`,
  question: {
    family: "enter",
    data: { input: "number", entry: "keypad", figure: { kind: "expression", text: "2 × 5 = ?" } },
  },
  added: "planned",
  placed: null,
  added_for: null,
  help_released: 0,
  help: [],
  tries: 0,
  ended,
  asked_at: AT,
});

function snapshot(
  id: AttemptId,
  status: "in_progress" | "paused" | "finished",
  questions: unknown[],
  language: "pl" | "en" = "pl",
): AttemptSnapshot {
  return AttemptSnapshot.parse({
    attempt: {
      id,
      pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
      assignment_id: ASSIGNMENT,
      lesson_version_id: "lesv_7qre3atahx8cpak6xbjtz73var",
      learner_id: null,
      player_name: null,
      mode: "real",
      status,
      resume_at: null,
      started_at: AT,
      finished_at: status === "finished" ? AT : null,
    },
    // The planned questions asked, at their seq; a twin is never on the plan.
    plan: (questions as PageAttemptQuestion[])
      .filter((q) => q.added === "planned")
      .map((q) => ({
        position: q.seq,
        lesson_question_id: q.lesson_question_id,
        question_type: q.question_type,
        say: q.say,
        question: q.question,
      })),
    language,
    questions,
    open_seq: status === "finished" ? null : questions.length,
    last_event_id: null,
  });
}

const refused = (): never => {
  throw new Error("not called in this test");
};

const INTRO: AssignmentIntro = {
  title: "Mnożenie przez 2 i 5",
  language: "pl",
  question_count: 4,
  identity: "none",
  open: true,
  first_name: null,
};

function client(
  changes: Partial<AttemptClient & AssignmentIntroClient>,
): AttemptClient & AssignmentIntroClient {
  return {
    getAssignmentIntro: async () => INTRO,
    startAttempt: refused,
    getAttempt: refused,
    answer: refused,
    help: refused,
    patchAttempt: refused,
    getResults: refused,
    getReview: refused,
    ...changes,
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(cleanup);

describe("PlayScreen", () => {
  it("starts an attempt in a new tab and keeps its id for a reload", async () => {
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
    render(
      <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
    );
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(startAttempt).toHaveBeenCalledTimes(1);
    expect(storedAttempt.get(ASSIGNMENT)).toBe(FRESH);
  });

  // dl-7wlo.44: while the attempt starts, one status in the page's words with Ołówek, decorative;
  // the question replaces it the moment it arrives, with no wait for the drawing.
  it("waits with Ołówek while the attempt starts, then shows the question at once", async () => {
    let start: (s: AttemptSnapshot) => void = () => undefined;
    const startAttempt = vi.fn(
      () =>
        new Promise<AttemptSnapshot>((resolve) => {
          start = resolve;
        }),
    );
    const { container } = render(
      <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
    );
    await vi.waitFor(() => expect(startAttempt).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status", { name: "Chwileczkę…" })).toBeTruthy();
    const art = container.querySelector("[data-slot=loading] img");
    expect(art?.getAttribute("data-character")).toBe("olowek");
    expect(art?.getAttribute("alt")).toBe("");
    await act(async () => start(snapshot(FRESH, "in_progress", [question(1)])));
    expect(screen.getAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(container.querySelector("[data-slot=loading]")).toBeNull();
  });

  // dl-1eieq.3: a borrowed question draws its credit in the instruction row; our own draw none.
  it("draws 'z Khan Academy' on a borrowed question, and its card on a tap", async () => {
    const borrowed = {
      ...(question(1) as PageAttemptQuestion),
      credit: {
        source: "khan",
        ref: "xmadeup0001",
        licence: "cc-by-nc-sa-4.0",
        original_lang: "en",
        adapted: false,
      },
    };
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [borrowed]));
    render(
      <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
    );
    const trigger = await screen.findByRole("button", { name: /^z Khan Academy/ });
    expect(trigger.textContent).toBe("z Khan Academy");
    await act(async () => fireEvent.click(trigger));
    const card = document.querySelector("[data-credit-card]") as HTMLElement;
    expect(card.hidden).toBe(false);
    expect(card.textContent).toContain("CC BY-NC-SA 4.0");
  });

  it("draws no credit on our own question", async () => {
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
    render(
      <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
    );
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(document.querySelector("[data-credit-trigger]")).toBeNull();
  });

  it("starts as the child a play link names in ?learner= (dl-1u6fn.5)", async () => {
    const learner = "lrn_2h4m8gyw0fb1cvz2nkqw0px8fq";
    window.history.replaceState(null, "", `${playPath(ASSIGNMENT)}?learner=${learner}`);
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
    render(
      <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
    );
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(startAttempt).toHaveBeenCalledExactlyOnceWith(ASSIGNMENT, { learner_id: learner });
  });

  it("starts with no learner when ?learner= is missing or malformed", async () => {
    for (const search of ["", "?learner=not-an-id"]) {
      window.sessionStorage.clear();
      window.history.replaceState(null, "", `${playPath(ASSIGNMENT)}${search}`);
      const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
      render(
        <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
      );
      expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
      expect(startAttempt).toHaveBeenCalledExactlyOnceWith(ASSIGNMENT, {});
      cleanup();
    }
  });

  it("never resumes a sibling's attempt: each child's link keeps its own (dl-1u6fn.5)", async () => {
    const A = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
    const B = LearnerId.parse("lrn_43007b83dp9w2tnfjxhha74cyq");
    const asChild = (id: AttemptId, learner: LearnerId): AttemptSnapshot => {
      const s = snapshot(id, "in_progress", [question(1)]);
      return { ...s, attempt: { ...s.attempt, learner_id: learner } };
    };
    // A played first in this tab; B's link opens in the same tab.
    storedAttempt.set(ASSIGNMENT, ATTEMPT, A);
    window.history.replaceState(null, "", `${playPath(ASSIGNMENT)}?learner=${B}`);
    const getAttempt = vi.fn(async () => asChild(ATTEMPT, A));
    const startAttempt = vi.fn(async () => asChild(FRESH, B));
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({ getAttempt, startAttempt })}
      />,
    );
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(getAttempt).not.toHaveBeenCalled();
    expect(startAttempt).toHaveBeenCalledExactlyOnceWith(ASSIGNMENT, { learner_id: B });
    expect(storedAttempt.get(ASSIGNMENT, B)).toBe(FRESH);
    expect(storedAttempt.get(ASSIGNMENT, A)).toBe(ATTEMPT);
  });

  it("starts afresh when the stored attempt is another child's", async () => {
    const A = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
    const B = LearnerId.parse("lrn_43007b83dp9w2tnfjxhha74cyq");
    storedAttempt.set(ASSIGNMENT, ATTEMPT, B);
    window.history.replaceState(null, "", `${playPath(ASSIGNMENT)}?learner=${B}`);
    const theirs = snapshot(ATTEMPT, "in_progress", [question(1)]);
    const getAttempt = vi.fn(async () => ({
      ...theirs,
      attempt: { ...theirs.attempt, learner_id: A },
    }));
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({ getAttempt, startAttempt })}
      />,
    );
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(startAttempt).toHaveBeenCalledExactlyOnceWith(ASSIGNMENT, { learner_id: B });
    expect(storedAttempt.get(ASSIGNMENT, B)).toBe(FRESH);
  });

  it("says the link is not complete when a learners assignment gets no valid ?learner=", async () => {
    for (const [language, line] of [
      ["pl", "Ten link jest niepełny. Poproś rodzica o nowy."],
      ["en", "This link is not complete. Ask a parent for a new one."],
    ] as const) {
      window.history.replaceState(null, "", `${playPath(ASSIGNMENT)}?learner=lrn_broken`);
      const startAttempt = vi.fn(async () => {
        throw new ApiError("name one", 400, "BadRequest");
      });
      render(
        <PlayScreen
          assignmentId={ASSIGNMENT}
          language={language}
          client={client({ startAttempt })}
        />,
      );
      expect(await screen.findByText(line)).toBeTruthy();
      cleanup();
    }
  });

  it("puts the lesson's language on the question and leaves Check the screens' (dl-9t2o.3, dl-uukj.38)", async () => {
    document.documentElement.lang = "pl";
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)], "en"));
    render(
      <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
    );
    await screen.findAllByText("Ile to jest dwa razy pięć? (1)");
    const langOf = (selector: string) =>
      document.querySelector(selector)?.closest("[lang]")?.getAttribute("lang");
    expect(langOf('[data-area="stem"]')).toBe("en");
    expect(langOf('[data-area="answer"]')).toBe("en");
    expect(langOf("[data-check]")).toBe("pl");
  });

  it("draws a Khan picture ref from the media URL (dl-n9fr.52)", async () => {
    vi.stubEnv("VITE_MEDIA_URL", "https://dx5i3bka3zn5f.cloudfront.net");
    const ref = "49eb6e79d51b5bc51d51bccdcd8c6f9d5c62e3126fa866e64e7a543dbd7bb6ed.png";
    const pictured = {
      ...(question(1) as PageAttemptQuestion),
      question: {
        family: "enter",
        data: {
          input: "number",
          entry: "keypad",
          stem: { pictures: [{ src: ref, alt: "A number chart", width: 400, height: 360 }] },
        },
      },
    };
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [pictured]));
    render(
      <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
    );
    const picture = (await screen.findAllByAltText("A number chart"))[0];
    expect(picture?.getAttribute("src")).toBe(`https://dx5i3bka3zn5f.cloudfront.net/${ref}`);
    vi.unstubAllEnvs();
  });

  it("waits on the paused screen after a reload, and resumes on the same question", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const patchAttempt = vi.fn(async () =>
      snapshot(ATTEMPT, "in_progress", [question(1, "correct"), question(2)]),
    );
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({
          getAttempt: async () =>
            snapshot(ATTEMPT, "paused", [question(1, "correct"), question(2)]),
          patchAttempt,
        })}
      />,
    );
    const back = await screen.findByText("Wracam do lekcji");
    expect(screen.getByText("Lekcja czeka na ciebie.")).toBeTruthy();
    await act(async () => fireEvent.click(back));
    expect(patchAttempt).toHaveBeenCalledWith(ATTEMPT, { status: "in_progress" });
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (2)")).not.toHaveLength(0);
  });

  it("shows the congratulation and the questions asked once the attempt is finished", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const finished = snapshot(ATTEMPT, "finished", [
      question(1, "correct"),
      question(2, "skipped"),
    ]);
    const results: AttemptResults = {
      attempt: finished.attempt,
      results: [
        {
          seq: 1,
          lesson_question_id: LQ,
          say: "Pierwsze",
          added: "planned",
          ended: "correct",
          help_used: 0,
        },
        {
          seq: 2,
          lesson_question_id: LQ,
          say: "Drugie",
          added: "twin",
          ended: "skipped",
          help_used: 2,
        },
      ],
    };
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({ getAttempt: async () => finished, getResults: async () => results })}
      />,
    );
    expect(await screen.findByText("Brawo! To już wszystko na dziś.")).toBeTruthy();
    expect(await screen.findByText("Pierwsze")).toBeTruthy();
    expect(screen.getByText("Udało się")).toBeTruthy();
    expect(screen.getByText("Wrócimy do tego")).toBeTruthy();
    expect(screen.getByText("podobne pytanie")).toBeTruthy();
    expect(screen.getByText("Pomoc: 2")).toBeTruthy();
    expect(screen.queryByText(/\d+ ?\/ ?\d+|%/)).toBeNull();
  });

  it("forgets an attempt the server does not know and starts a new one", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({
          getAttempt: async () => {
            throw new ApiError("no such attempt", 404, "NotFound");
          },
          startAttempt,
        })}
      />,
    );
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(storedAttempt.get(ASSIGNMENT)).toBe(FRESH);
  });

  describe("the review", () => {
    const finished = (): AttemptSnapshot =>
      snapshot(ATTEMPT, "finished", [question(1, "correct"), question(2, "missed")]);
    const results = (): AttemptResults => ({
      attempt: finished().attempt,
      results: [
        {
          seq: 1,
          lesson_question_id: LQ,
          say: "Pierwsze",
          added: "planned",
          ended: "correct",
          help_used: 0,
        },
        {
          seq: 2,
          lesson_question_id: LQ,
          say: "Drugie",
          added: "planned",
          ended: "missed",
          help_used: 0,
        },
      ],
    });
    const review = () => ({
      attempt: finished().attempt,
      questions: [reviewQuestion(1, "correct"), reviewQuestion(2, "missed")],
    });
    const finishedClient = (
      changes: Partial<AttemptClient> = {},
    ): AttemptClient & AssignmentIntroClient =>
      client({
        getAttempt: async () => finished(),
        getResults: async () => results(),
        getReview: async () => review(),
        ...changes,
      });

    it("a card opens its question, the arrows walk the list, and Wszystkie pytania goes back", async () => {
      storedAttempt.set(ASSIGNMENT, ATTEMPT);
      window.history.replaceState(null, "", `${playPath(ASSIGNMENT)}?lang=pl`);
      render(<PlayScreen assignmentId={ASSIGNMENT} language="pl" client={finishedClient()} />);
      const first = (await screen.findByText("Pierwsze")).closest("a");
      expect(first?.getAttribute("href")).toBe(`${reviewPath(ASSIGNMENT, 1)}?lang=pl`);
      // The congratulation stays first, above the cards.
      const congrats = screen.getByText("Brawo! To już wszystko na dziś.");
      expect(
        congrats.compareDocumentPosition(first as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();

      await act(async () => fireEvent.click(first as Element));
      expect(window.location.pathname).toBe(reviewPath(ASSIGNMENT, 1));
      expect(await screen.findByText("Pytanie 1 z 2")).toBeTruthy();
      expect(screen.queryByLabelText("Poprzednie")).toBeNull();
      expect(document.querySelector("[data-review-solution]")).toBeNull();

      await act(async () => fireEvent.click(screen.getByLabelText("Następne")));
      expect(window.location.pathname).toBe(reviewPath(ASSIGNMENT, 2));
      expect(window.location.search).toBe("?lang=pl");
      expect(await screen.findByText("Pytanie 2 z 2")).toBeTruthy();
      expect(screen.queryByLabelText("Następne")).toBeNull();
      expect(screen.getByText("Poprawna odpowiedź")).toBeTruthy();

      await act(async () => fireEvent.click(screen.getByText("Wszystkie pytania")));
      expect(window.location.pathname).toBe(playPath(ASSIGNMENT));
      expect(await screen.findByText("Brawo! To już wszystko na dziś.")).toBeTruthy();
    });

    it("a reload on a review path opens the same question from the tab's attempt", async () => {
      storedAttempt.set(ASSIGNMENT, ATTEMPT);
      window.history.replaceState(null, "", reviewPath(ASSIGNMENT, 2));
      const getReview = vi.fn(async () => review());
      render(
        <PlayScreen
          assignmentId={ASSIGNMENT}
          language="pl"
          client={finishedClient({ getReview })}
        />,
      );
      expect(await screen.findByText("Pytanie 2 z 2")).toBeTruthy();
      expect(getReview).toHaveBeenCalledWith(ATTEMPT);
      expect(screen.getByText("Jeszcze się uczymy")).toBeTruthy();
    });

    it("sends the review again while the failure is transient", async () => {
      storedAttempt.set(ASSIGNMENT, ATTEMPT);
      window.history.replaceState(null, "", reviewPath(ASSIGNMENT, 1));
      const getReview = vi
        .fn<AttemptClient["getReview"]>()
        .mockRejectedValueOnce(new TransientError("offline"))
        .mockImplementation(async () => review());
      render(
        <PlayScreen
          assignmentId={ASSIGNMENT}
          language="pl"
          client={finishedClient({ getReview })}
        />,
      );
      expect(await screen.findByText("Pytanie 1 z 2", {}, { timeout: 3000 })).toBeTruthy();
      expect(getReview).toHaveBeenCalledTimes(2);
    });

    it("a seq the attempt has no question at goes back to the list", async () => {
      storedAttempt.set(ASSIGNMENT, ATTEMPT);
      window.history.replaceState(null, "", reviewPath(ASSIGNMENT, 9));
      render(<PlayScreen assignmentId={ASSIGNMENT} language="pl" client={finishedClient()} />);
      expect(await screen.findByText("Pierwsze")).toBeTruthy();
      expect(window.location.pathname).toBe(playPath(ASSIGNMENT));
    });

    it("a review path on an attempt still being played goes back to the lesson", async () => {
      storedAttempt.set(ASSIGNMENT, ATTEMPT);
      window.history.replaceState(null, "", reviewPath(ASSIGNMENT, 1));
      render(
        <PlayScreen
          assignmentId={ASSIGNMENT}
          language="pl"
          client={client({
            getAttempt: async () => snapshot(ATTEMPT, "in_progress", [question(1)]),
          })}
        />,
      );
      expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
      expect(window.location.pathname).toBe(playPath(ASSIGNMENT));
    });
  });

  /**
   * The celebrations (dl-7wlo.41, dl-7wlo.43): one plays at the praise that ends a run of three
   * clean rights, wherever in the lesson it falls; the count starts again after it, and two is the
   * most a lesson has. The first is the queen or Pani Iwona at random, the second the other one.
   * Answers go through the page (an option, Sprawdź, Dalej), so removing them from PlayScreen fails
   * these tests.
   */
  describe("the celebrations", () => {
    const chosen = (seq: number): unknown => ({
      ...(question(seq) as PageAttemptQuestion),
      question: {
        family: "choose",
        data: {
          options: [
            { id: "o1", content: { kind: "number", number: 10 } },
            { id: "o2", content: { kind: "number", number: 12 } },
          ],
          select: "one",
          layout: "grid",
        },
      },
    });

    /** The attempt's coin (celebration.ts firstCast): the queen goes first on one, Pani Iwona on the other. */
    const QUEEN_FIRST = ATTEMPT;
    const IWONA_FIRST = FRESH;

    /** A clean right at `seq`, as a snapshot after a reload carries it. */
    const done = (seq: number): unknown => ({
      ...(chosen(seq) as object),
      ended: "correct",
      tries: 1,
    });

    /** A double that marks the first try at each seq in `misses` wrong, and every other try right. */
    function lesson(
      misses: readonly number[],
      {
        id = QUEEN_FIRST,
        lessonLanguage = "pl",
      }: { id?: AttemptId; lessonLanguage?: "pl" | "en" } = {},
    ): AttemptClient & AssignmentIntroClient {
      return client({
        startAttempt: async () => snapshot(id, "in_progress", [chosen(1)], lessonLanguage),
        // A reload after 3 clean rights: the attempt resumes on its 4th question.
        getAttempt: async () =>
          snapshot(id, "in_progress", [done(1), done(2), done(3), chosen(4)], lessonLanguage),
        answer: async (_id, body: AttemptAnswerRequest) => {
          const right = !(misses.includes(body.seq) && body.try_no === 1);
          return AttemptAnswerResult.parse({
            event_id: body.event_id,
            seq: body.seq,
            try_no: body.try_no,
            replayed: false,
            correct: right,
            parts: right ? null : [],
            reveal: right ? {} : null,
            ended: right ? "correct" : null,
            next: right ? chosen(body.seq + 1) : null,
            attempt_status: "in_progress",
          });
        },
      });
    }

    const queen = (): Element | null => document.querySelector("[data-queen]");
    const iwona = (): Element | null => document.querySelector("[data-iwona]");
    const shown = (): number => document.querySelectorAll("[data-celebration]").length;

    /** Pick an option and press Sprawdź, as a keyboard does (no pointerdown, which hides them). */
    async function answer(seq: number, pick = "10"): Promise<void> {
      const option = await screen.findByText(pick);
      await act(async () => fireEvent.click(option));
      await act(async () =>
        fireEvent.click(document.querySelector("[data-check]") as Element, { detail: 0 }),
      );
      expect(screen.getAllByText(`Ile to jest dwa razy pięć? (${seq})`)).not.toHaveLength(0);
    }

    async function next(): Promise<void> {
      await act(async () =>
        fireEvent.click(document.querySelector("[data-next]") as Element, { detail: 0 }),
      );
    }

    /** Answers `seqs` right, each followed by Dalej, with no celebration at any of them. */
    async function quiet(seqs: readonly number[]): Promise<void> {
      for (const seq of seqs) {
        await answer(seq);
        expect(shown()).toBe(0);
        await next();
      }
    }

    beforeEach(() => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it("plays at a later run of three after a miss, goes on Dalej, then once more, and not again", async () => {
      render(<PlayScreen assignmentId={ASSIGNMENT} language="pl" client={lesson([2])} />);
      await answer(1);
      await next();
      await answer(2); // a miss: the run starts again
      await answer(2, "12"); // a changed answer brings Sprawdź back
      await next();
      await quiet([3, 4]);
      await answer(5);
      expect(queen()).not.toBeNull();
      expect(shown()).toBe(1);
      await next();
      expect(queen()).toBeNull();
      // The count starts again after her: the second needs three more, and it is Pani Iwona.
      await quiet([6, 7]);
      await answer(8);
      expect(iwona()).not.toBeNull();
      expect(shown()).toBe(1);
      await next();
      expect(shown()).toBe(0);
      await quiet([9, 10, 11, 12, 13, 14]);
    });

    it("a miss after the first starts the count for the second again", async () => {
      render(<PlayScreen assignmentId={ASSIGNMENT} language="pl" client={lesson([5])} />);
      await quiet([1, 2]);
      await answer(3);
      expect(queen()).not.toBeNull();
      await next();
      await quiet([4]);
      await answer(5); // a miss after one right
      await answer(5, "12");
      expect(shown()).toBe(0);
      await next();
      await quiet([6, 7]);
      await answer(8);
      expect(iwona()).not.toBeNull();
    });

    it("Pani Iwona can go first, then the queen", async () => {
      render(
        <PlayScreen
          assignmentId={ASSIGNMENT}
          language="pl"
          client={lesson([], { id: IWONA_FIRST })}
        />,
      );
      await quiet([1, 2]);
      await answer(3);
      expect(iwona()).not.toBeNull();
      expect(queen()).toBeNull();
      await next();
      await quiet([4, 5]);
      await answer(6);
      expect(queen()).not.toBeNull();
      expect(iwona()).toBeNull();
    });

    it("Pani Iwona speaks the page's language, not the lesson's", async () => {
      render(
        <PlayScreen
          assignmentId={ASSIGNMENT}
          language="en"
          client={lesson([], { id: IWONA_FIRST, lessonLanguage: "pl" })}
        />,
      );
      await quiet([1, 2]);
      await answer(3);
      const sources = [...document.querySelectorAll("[data-iwona] source")].map(
        (s) => s.getAttribute("src") ?? "",
      );
      expect(sources).toHaveLength(2);
      expect(sources.every((src) => src.includes("iwona-en"))).toBe(true);
    });

    // The steward's case on #871: a reload between the two must not let the same one play twice.
    it("after a reload between the two, the second is still the other one", async () => {
      const double = lesson([]);
      render(<PlayScreen assignmentId={ASSIGNMENT} language="pl" client={double} />);
      await quiet([1, 2]);
      await answer(3);
      expect(queen()).not.toBeNull();
      cleanup();
      render(<PlayScreen assignmentId={ASSIGNMENT} language="pl" client={double} />);
      await quiet([4, 5]);
      await answer(6);
      expect(iwona()).not.toBeNull();
      expect(queen()).toBeNull();
    });

    it("a tap hides her", async () => {
      render(<PlayScreen assignmentId={ASSIGNMENT} language="pl" client={lesson([])} />);
      await quiet([1, 2]);
      await answer(3);
      expect(queen()).not.toBeNull();
      await act(async () => fireEvent.pointerDown(document.body));
      expect(queen()).toBeNull();
    });
  });
});

describe("a given lesson's first screen", () => {
  const CHILD = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
  const given = { ...INTRO, identity: "pick" as const };
  const started = () => vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
  const open = (search: string, intro: AssignmentIntro, startAttempt = started()) => {
    window.history.replaceState(null, "", `${playPath(ASSIGNMENT)}${search}`);
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({ getAssignmentIntro: async () => intro, startAttempt })}
      />,
    );
    return startAttempt;
  };
  const playing = () => screen.findAllByText("Ile to jest dwa razy pięć? (1)");

  it("with a child in the link, shows the title and count and starts only on 'Tak, jestem'", async () => {
    const start = open(`?learner=${CHILD}`, { ...given, first_name: "Tymek" });
    const yes = await screen.findByRole("button", { name: "Tak, jestem Tymek" });
    expect(screen.getByText("Mnożenie przez 2 i 5")).toBeTruthy();
    expect(screen.getByText("4 zadania")).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
    fireEvent.click(yes);
    await playing();
    expect(start).toHaveBeenCalledExactlyOnceWith(ASSIGNMENT, { learner_id: CHILD });
  });

  it("'To nie ja' asks for a name, and the attempt is that player's, not the child's", async () => {
    const start = open(`?learner=${CHILD}`, { ...given, first_name: "Tymek" });
    fireEvent.click(await screen.findByRole("button", { name: "To nie ja" }));
    fireEvent.change(screen.getByLabelText("Jak masz na imię?"), { target: { value: " Ola " } });
    fireEvent.click(screen.getByRole("button", { name: "Zaczynamy" }));
    await playing();
    expect(start).toHaveBeenCalledExactlyOnceWith(ASSIGNMENT, { player_name: "Ola" });
    expect(storedAttempt.get(ASSIGNMENT)).toBe(FRESH);
    expect(storedAttempt.get(ASSIGNMENT, CHILD)).toBeNull();
  });

  it("with no child, asks for a name and refuses a blank one in kind words", async () => {
    const start = open("", given);
    await screen.findByLabelText("Jak masz na imię?");
    expect(screen.queryByRole("button", { name: "To nie ja" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Zaczynamy" }));
    expect(await screen.findByText("Napisz swoje imię albo zagraj bez imienia.")).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
  });

  it("'Zagraj bez imienia' starts with neither a name nor a child", async () => {
    const start = open("", given);
    fireEvent.click(await screen.findByRole("button", { name: "Zagraj bez imienia" }));
    await playing();
    expect(start).toHaveBeenCalledExactlyOnceWith(ASSIGNMENT, {});
  });

  it("offers nobody else on an older learners-only link", async () => {
    open(`?learner=${CHILD}`, { ...given, open: false, first_name: "Tymek" });
    await screen.findByRole("button", { name: "Tak, jestem Tymek" });
    expect(screen.queryByRole("button", { name: "To nie ja" })).toBeNull();
  });

  it("says a learners-only link naming no child is not complete, with nothing to tap", async () => {
    const start = open("", { ...given, open: false });
    expect(await screen.findByText("Ten link jest niepełny. Poproś rodzica o nowy.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(start).not.toHaveBeenCalled();
  });

  it("a lesson with no identity step opens straight in, with no first screen", async () => {
    const start = open("", INTRO);
    await playing();
    expect(document.querySelector("[data-intro]")).toBeNull();
    expect(start).toHaveBeenCalledExactlyOnceWith(ASSIGNMENT, {});
  });

  it("leaves out a count of 0", async () => {
    open("", { ...given, question_count: 0 });
    await screen.findByText("Mnożenie przez 2 i 5");
    expect(screen.queryByText(/zada/)).toBeNull();
  });

  it("a reload resumes with no first screen, the child's attempt or the guest's", async () => {
    for (const held of [CHILD, null]) {
      window.sessionStorage.clear();
      storedAttempt.set(ASSIGNMENT, ATTEMPT, held);
      window.history.replaceState(null, "", `${playPath(ASSIGNMENT)}?learner=${CHILD}`);
      const getAttempt = vi.fn(async () =>
        AttemptSnapshot.parse({
          ...snapshot(ATTEMPT, "in_progress", [question(1)]),
          attempt: {
            ...snapshot(ATTEMPT, "in_progress", [question(1)]).attempt,
            learner_id: held,
          },
        }),
      );
      const getAssignmentIntro = vi.fn(async () => given);
      render(
        <PlayScreen
          assignmentId={ASSIGNMENT}
          language="pl"
          client={client({ getAttempt, getAssignmentIntro })}
        />,
      );
      await playing();
      expect(getAssignmentIntro).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("says a link that is gone is not found", async () => {
    window.history.replaceState(null, "", playPath(ASSIGNMENT));
    const getAssignmentIntro = vi.fn(async () => {
      throw new ApiError("no such assignment", 404, "NotFound");
    });
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({ getAssignmentIntro })}
      />,
    );
    expect(await screen.findByText("Tej lekcji tu nie ma.")).toBeTruthy();
  });
});
