/**
 * Money (dl-w3.61.6, lane E): money_pay's solution, its checks, its view by tap and by keyboard;
 * money_count's key, checks and format; the coins figure and its alt. The judge is `packages/core`'s.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback } from "../../stage/types.ts";
import { solutionOf } from "../answer.ts";
import { FigureView } from "../FigureView.tsx";
import type { Figure } from "../figure.ts";
import { type Denom, fewestOf, formatAmount, tokenOf } from "../money.ts";
import { Family, QuestionType, Surface } from "../names.ts";
import { MONEY_GAPS, MONEY_TEMPLATE, moneyKey } from "../slots/money.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import type { PlaceData, PlaceKey } from "./model.ts";
import { PlaceView } from "./PlaceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };
const BANK: Denom[] = ["gr10", "gr20", "gr50", "zl1", "zl2", "zl5"];
const data: PlaceData = {
  surface: Surface.Coins,
  bank: BANK,
  amount_label: "3 zł 50 gr",
  slots: 6,
};
const key: PlaceKey = { surface: Surface.Coins, amount_gr: 350 };
const pay = (d: PlaceData = data, k: PlaceKey = key): SpecOf<typeof Family.Place> => ({
  id: "s1",
  say: "Zapłać dokładnie.",
  question_type: QuestionType.MoneyPay,
  family: Family.Place,
  data: d,
  key: k,
});

describe("money helpers", () => {
  it("writes an amount split or decimal", () => {
    expect(formatAmount(350)).toBe("3 zł 50 gr");
    expect(formatAmount(400)).toBe("4 zł");
    expect(formatAmount(60)).toBe("60 gr");
    expect(formatAmount(305, "decimal")).toBe("3,05 zł");
  });
  it("finds the fewest coins the bank allows, or none", () => {
    expect(fewestOf(400, ["zl1", "zl2", "zl5"])).toEqual(["zl2", "zl2"]);
    expect(fewestOf(30, ["gr20", "gr50"])).toBeNull();
    expect(fewestOf(60, ["gr10", "gr20", "gr50"])).toEqual(["gr50", "gr10"]);
  });
  it("draws grosze, złoty coins and notes apart", () => {
    expect(tokenOf("gr2")).toEqual({ face: "2 gr", metal: "gr", size: "sm", mm: 17.5 });
    expect(tokenOf("zl5").metal).toBe("zl");
    expect(tokenOf("zl20")).toEqual({ face: "20 zł", metal: "note", size: "note" });
  });
});

describe("money_pay solution", () => {
  it("shows the fewest coins as the solution", () => {
    expect(solutionOf(pay())).toEqual({ items: ["zl2", "zl1", "gr50"] });
  });
});

describe("money_pay checks", () => {
  const rules = (d: PlaceData, k: PlaceKey = key) => validate(pay(d, k)).map((p) => p.rule);
  it("passes a payable step", () => expect(rules(data)).toEqual([]));
  it("refuses a coin not on the list, a bank that cannot pay and a tray too small", () => {
    expect(rules({ ...data, bank: ["zl3" as Denom, "gr50"] })).toContain("unknown_denomination");
    expect(rules({ ...data, bank: ["zl2"] })).toContain("bank_cannot_pay");
    expect(rules({ ...data, bank: ["gr50"], slots: 4 })).toContain("tray_too_small");
  });
});

describe("money_pay view", () => {
  const props = (
    spec: PageSpecOf<typeof Family.Place>,
    feedback: Feedback | null,
    attemptNo: number,
    onCommit: (c: unknown) => void,
  ) => ({
    language: "en" as const,
    category: "child" as const,
    clock,
    mode: ViewMode.Play,
    spec,
    live: true,
    attemptNo,
    feedback,
    onCommit,
  });
  const tap = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }), { detail: 0 });

  it("adds by tap, takes back without moving the others, commits the tray, and keeps it red after a miss", () => {
    const onCommit = vi.fn();
    const spec = pageSpec(pay()) as PageSpecOf<typeof Family.Place>;
    const out = render(
      <StepFrame stepId="s1">
        <PlaceView {...props(spec, null, 1, onCommit)} />
      </StepFrame>,
    );
    expect(document.querySelectorAll("[data-place]").length).toBe(6);
    tap("Put 2 zł in the tray");
    tap("Put 1 zł in the tray");
    tap("Put 50 gr in the tray");
    tap("Take 1 zł back from the tray");
    const places = [...document.querySelectorAll<HTMLElement>("[data-place]")].map(
      (p) => p.dataset["place"],
    );
    expect(places).toEqual(["zl2", "empty", "gr50", "empty", "empty", "empty"]);
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ items: ["zl2", "gr50"] });
    act(() =>
      out.rerender(
        <StepFrame stepId="s1">
          <PlaceView {...props(spec, { kind: "try_again", index: 0 }, 2, onCommit)} />
        </StepFrame>,
      ),
    );
    expect(document.querySelector<HTMLElement>("[data-tray]")?.dataset["tone"]).toBe("try_again");
    tap("Put 1 zł in the tray");
    expect(document.querySelector<HTMLElement>("[data-tray]")?.dataset["tone"]).toBe("idle");
  });

  it("commits nothing from an empty tray, and draws no total while it is hidden", () => {
    const onCommit = vi.fn();
    render(
      <StepFrame stepId="s1">
        <PlaceView
          {...props(pageSpec(pay()) as PageSpecOf<typeof Family.Place>, null, 1, onCommit)}
        />
      </StepFrame>,
    );
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.querySelector("[data-coins-total]")).toBeNull();
  });

  it("fills no more places than the tray has, and shows the running total when asked", () => {
    const spec = pageSpec(pay({ ...data, slots: 2, total: "shown" })) as PageSpecOf<
      typeof Family.Place
    >;
    render(
      <StepFrame stepId="s1">
        <PlaceView {...props(spec, null, 1, vi.fn())} />
      </StepFrame>,
    );
    tap("Put 2 zł in the tray");
    tap("Put 50 gr in the tray");
    expect(
      screen.getByRole("button", { name: "Put 1 zł in the tray" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(document.querySelector<HTMLElement>("[data-coins-total]")?.dataset["coinsTotal"]).toBe(
      "250",
    );
    expect(screen.getByText("In the tray: 2 zł 50 gr")).toBeTruthy();
  });

  it("reviews the tray beside the fewest coins", () => {
    const spec = pageSpec(pay()) as PageSpecOf<typeof Family.Place>;
    render(
      <PlaceView
        mode={ViewMode.Review}
        spec={spec}
        language="pl"
        category="child"
        clock={clock}
        value={{ items: ["zl2", "zl1"] }}
        answerKey={key}
        verdict={{ correct: false, mistake_class: "one_coin_off", parts: [] }}
      />,
    );
    expect(document.querySelectorAll("[data-tray]").length).toBe(2);
  });
});

describe("money_count", () => {
  const PURSE: Denom[] = ["zl2", "zl1", "gr50", "gr20"];
  const TWENTIES: Denom[] = Array.from({ length: 8 }, () => "gr20" as Denom);
  const count = (items: Denom[], alt = "Monety w portfelu."): SpecOf<typeof Family.Slots> => ({
    id: "s1",
    say: "Ile pieniędzy jest w portfelu?",
    question_type: QuestionType.MoneyCount,
    family: Family.Slots,
    data: { figure: { kind: "coins", items, alt }, template: MONEY_TEMPLATE, gaps: MONEY_GAPS },
    key: moneyKey(items),
  });
  it("derives the key and its near misses from the coins", () => {
    const s = count(TWENTIES);
    expect(s.key.gaps["zl"]).toMatchObject({
      accept: ["1"],
      near: { "0": "grosze_not_carried", "8": "counted_coins_not_value" },
    });
    expect(s.key.gaps["gr"]).toMatchObject({
      accept: ["60"],
      near: { "160": "grosze_not_carried", "8": "counted_coins_not_value" },
    });
  });
  it("passes a purse, and refuses a key that is not its total or an alt that says it", () => {
    expect(validate(count(PURSE)).map((p) => p.rule)).toEqual([]);
    expect(validate({ ...count(PURSE), key: moneyKey(["zl2"]) }).map((p) => p.rule)).toContain(
      "money_key_mismatch",
    );
    expect(validate(count(PURSE, "W portfelu jest 3 zł 70 gr.")).map((p) => p.rule)).toContain(
      "key_in_alt",
    );
    expect(
      validate({ ...count(PURSE), data: { ...count(PURSE).data, template: "{zl} {gr}" } }).map(
        (p) => p.rule,
      ),
    ).toContain("money_template");
  });
  it("writes złote and grosze as two gaps, the grosze two digits from 0 to 99 (addendum 4.7)", () => {
    const s = count(["zl1", "gr5"]);
    expect(s.data.template).toBe("{zl} zł {gr} gr");
    expect(s.data.gaps[1]).toMatchObject({ max_length: 2, range: [0, 99] });
    expect(s.key.gaps["gr"]).toMatchObject({ accept: ["5"] });
  });
  it("draws the purse as tokens, read by its alt", () => {
    const figure: Figure = { kind: "coins", items: PURSE, alt: "Portfel." };
    render(<FigureView figure={figure} language="pl" />);
    expect(
      screen.getByRole("img", { name: "Portfel." }).querySelectorAll("[data-coin]").length,
    ).toBe(4);
  });
  it("needs alt text on the coins", () => {
    expect(validate(count(PURSE, " ")).map((p) => p.rule)).toContain("missing_alt");
  });
});
