// @vitest-environment happy-dom
/**
 * The choose form (dl-uukj.47.35) over plan-and-cite's approval, which carries a choose form: it
 * takes the composer's place while the turn waits on it, the recommended option first and marked,
 * a number key picks, "Pomiń pytanie" skips, the parent may answer in their own words, the answer
 * goes to onAnswer (a stand-in until dl-uukj.47.48), the recap stays in the thread, and the composer
 * comes back with the focus.
 */

import { type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatPane } from "./ChatPane.tsx";
import type { ChooseAnswers } from "./ChooseForm.tsx";
import type { Turn } from "./conversation.ts";

afterEach(cleanup);

const log = (RUN_LOGS.find((l) => l.name === "plan-and-cite")?.events ?? []).map((e) =>
  RunEvent.parse(e),
);

/** plan-and-cite as far as it waits on the parent: the approval asked, not yet resolved. */
function waiting(): Turn {
  const view = foldRun(log.filter((e) => e.seq <= 12));
  const run = {
    id: RunId.parse(log[0]?.run_id),
    status: "awaiting_input",
  } as Run;
  return { run, view };
}

function pane(onChoose: (call: string, answers: ChooseAnswers) => void = () => {}) {
  render(
    <ChatPane
      language="pl"
      variant="parent"
      turns={[waiting()]}
      queued={[]}
      restoring={false}
      stopping={false}
      sendFailed={false}
      onSend={() => {}}
      onStop={() => {}}
      onChoose={onChoose}
    />,
  );
}

const form = () => document.querySelector("[data-choose]") as HTMLElement | null;
const composer = () => document.querySelector("textarea");

describe("the choose form", () => {
  it("takes the composer's place, the recommended option first and marked, with the focus on it", () => {
    pane();
    expect(form()).not.toBeNull();
    expect(composer()).toBeNull();
    expect(form()?.textContent).toContain("How many carrying questions?");
    const options = [...(form()?.querySelectorAll("[data-option]") ?? [])];
    expect(options.map((o) => o.getAttribute("data-recommended"))).toEqual(["true", "false"]);
    expect(options[0]?.textContent).toContain("2 · polecane");
    expect(document.activeElement).toBe(options[0]);
  });

  it("picks an option by its number key, answers onAnswer, keeps the recap, and gives the composer back", async () => {
    const given: [string, ChooseAnswers][] = [];
    pane((call, answers) => given.push([call, answers]));
    // The focus sits on the first option; the key goes from there.
    await act(async () => fireEvent.keyDown(document.activeElement as HTMLElement, { key: "2" }));
    expect(given).toEqual([["call_2", ["4"]]]);
    expect(form()).toBeNull();
    expect(composer()).not.toBeNull();
    expect(document.activeElement).toBe(composer());
    expect(document.querySelector("[data-choose-recap]")?.textContent).toBe(
      "How many carrying questions? · 4",
    );
  });

  it("skips with Pomiń pytanie, and says so in the recap", async () => {
    const given: ChooseAnswers[] = [];
    pane((_call, answers) => given.push(answers));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Pomiń pytanie" })));
    expect(given).toEqual([[null]]);
    expect(document.querySelector("[data-choose-recap]")?.textContent).toBe(
      "How many carrying questions? · pominięte",
    );
  });

  it("takes an answer in the parent's own words, and a number typed there is a word, not a pick", async () => {
    const given: ChooseAnswers[] = [];
    pane((_call, answers) => given.push(answers));
    const own = document.querySelector("[data-choose-own]") as HTMLInputElement;
    await act(async () => fireEvent.keyDown(own, { key: "1" }));
    expect(given).toEqual([]);
    await act(async () => fireEvent.change(own, { target: { value: "3, ale krótkie" } }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Odpowiedz" })));
    expect(given).toEqual([["3, ale krótkie"]]);
  });
});
