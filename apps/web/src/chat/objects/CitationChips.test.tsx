import type { Citation } from "@jadwigo/contracts";
import type { Run } from "@jadwigo/contracts/run";
import { RunEvent, RunId } from "@jadwigo/contracts/run";
import type { ChatItem, RunView } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane } from "../ChatPane.tsx";
import type { Turn } from "../conversation.ts";
import { CitationChips, citedObjects } from "./CitationChips.tsx";
import type { ObjectRef } from "./ref.ts";

afterEach(cleanup);

const ATTEMPT_1 = "att_00000000000000000000000001";
const ATTEMPT_2 = "att_00000000000000000000000002";
const SKILL = "math.add-within-20";
const GOAL = "gol_00000000000000000000000001";

const CITED = [
  { kind: "attempt", attempt_id: ATTEMPT_1 },
  { kind: "skill", skill_code: SKILL },
  { kind: "attempt", attempt_id: ATTEMPT_2 },
  { kind: "attempt", attempt_id: ATTEMPT_1 },
  { kind: "goal", goal_id: GOAL },
] as unknown as Citation[];

/** The happy golden log as a finished turn, its agent message given `citations` (or none). */
function turn(citations: Citation[] | undefined): Turn {
  const log = RUN_LOGS.find((l) => l.name === "happy-turn");
  if (log === undefined) throw new Error("no golden log happy-turn");
  const view = structuredClone(log.expected) as RunView;
  view.chat = view.chat.map((item: ChatItem) =>
    item.kind === "message" && item.from === "agent" && citations !== undefined
      ? { ...item, citations }
      : item,
  );
  const run = {
    id: RunId.parse(RunEvent.parse(log.events[0]).run_id),
    status: view.status ?? "completed",
  } as unknown as Run;
  return { run, view };
}

function pane(turns: Turn[], onOpen?: (object: ObjectRef) => void) {
  render(
    <ChatPane
      language="pl"
      variant="parent"
      turns={turns}
      queued={[]}
      restoring={false}
      stopping={false}
      sendFailed={false}
      onSend={() => {}}
      onStop={() => {}}
      {...(onOpen === undefined ? {} : { onOpen })}
    />,
  );
}

describe("a message's citations as chips (dl-uukj.47.62)", () => {
  it("names each cited thing once, in order, and skips a goal it has no kind for", () => {
    expect(citedObjects(CITED)).toEqual([
      { kind: "attempt", id: ATTEMPT_1 },
      { kind: "skill", id: SKILL },
      { kind: "attempt", id: ATTEMPT_2 },
    ]);
  });

  it("draws Dlaczego? under a cited agent message; a chip opens its thing, and shows no id", () => {
    const onOpen = vi.fn();
    pane([turn(CITED)], onOpen);
    expect(screen.getByText("Dlaczego?")).toBeTruthy();
    const chips = [...document.querySelectorAll("[data-citation]")].map((c) => c.textContent);
    expect(chips).toEqual(["Rozegrana lekcja 1", "Umiejętność", "Rozegrana lekcja 2"]);
    expect(document.querySelector("[data-citations]")?.textContent).not.toMatch(/att_|math\./);
    fireEvent.click(screen.getByRole("button", { name: "Rozegrana lekcja 2" }));
    expect(onOpen).toHaveBeenCalledWith({ kind: "attempt", id: ATTEMPT_2 });
  });

  it("draws nothing for an uncited message, for a goal alone, or without onOpen", () => {
    pane([turn(undefined)], vi.fn());
    expect(document.querySelector("[data-citations]")).toBeNull();
    cleanup();
    pane([turn(CITED)]);
    expect(document.querySelector("[data-citations]")).toBeNull();
    cleanup();
    render(
      <CitationChips
        citations={[{ kind: "goal", goal_id: GOAL } as unknown as Citation]}
        language="pl"
        onOpen={() => {}}
      />,
    );
    expect(document.querySelector("[data-citations]")).toBeNull();
  });
});
