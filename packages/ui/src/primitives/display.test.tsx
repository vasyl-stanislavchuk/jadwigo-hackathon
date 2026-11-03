// @vitest-environment happy-dom
// The adult kit's display parts (dl-uukj.47.67.4): status, badge, chip, disc and its stack, skeleton,
// empty, result bar and pager, as a person meets them (role and text). happy-dom draws nothing, so a
// shape or a tone is read from the data attribute or the token class the part promises.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TONE_COUNT, toneClasses } from "../lib/tone.ts";
import { Badge } from "./badge.tsx";
import { Chip } from "./chip.tsx";
import { Disc, DiscStack } from "./disc.tsx";
import { Empty } from "./empty.tsx";
import { Pagination } from "./pagination.tsx";
import { ResultBar } from "./result-bar.tsx";
import { Skeleton } from "./skeleton.tsx";
import { type LessonStatus, Status } from "./status.tsx";

afterEach(cleanup);

describe("Status", () => {
  const states: [LessonStatus, string][] = [
    ["draft", "Szkic"],
    ["ready", "Gotowa"],
    ["in-progress", "W trakcie"],
    ["done", "Zrobiona"],
  ];

  it.each(states)("names %s in words, with a dot whose shape says it", (status, words) => {
    render(<Status status={status}>{words}</Status>);
    const pill = screen.getByText(words);
    expect(pill.getAttribute("data-status")).toBe(status);
    const dot = pill.querySelector("[aria-hidden=true]");
    expect(dot).not.toBeNull();
    // No verdict hue on a status (S3).
    expect(pill.innerHTML).not.toMatch(/jw-(right|miss|help)|kid-(correct|try-again)/);
  });

  it("draws four different dots", () => {
    const dots = states.map(([s, w]) => {
      const { container } = render(<Status status={s}>{w}</Status>);
      return container.querySelector("[aria-hidden=true]")?.className;
    });
    expect(new Set(dots).size).toBe(4);
  });
});

describe("Badge", () => {
  it("keeps the variants today's callers use", () => {
    for (const v of ["default", "secondary", "outline", "correct", "try-again"] as const) {
      render(<Badge variant={v}>{v}</Badge>);
      expect(screen.getByText(v).getAttribute("data-variant")).toBe(v);
    }
  });

  it("draws a count and a tag at the adult's sizes", () => {
    render(
      <>
        <Badge variant="count">12</Badge>
        <Badge variant="tag">klasa 3</Badge>
      </>,
    );
    expect(screen.getByText("12").className).toMatch(/(^|\s)text-jw-page-micro(\s|$)/);
    expect(screen.getByText("12").className).not.toMatch(/(^|\s)text-base(\s|$)/);
    expect(screen.getByText("klasa 3").className).toMatch(/(^|\s)rounded-jw-small(\s|$)/);
  });
});

describe("Chip", () => {
  it("is a picked value in the selected colours", () => {
    render(<Chip>Marta</Chip>);
    expect(screen.getByText("Marta").className).toMatch(/(^|\s)bg-selected(\s|$)/);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers a named × that removes it", () => {
    const remove = vi.fn();
    render(
      <Chip onRemove={remove} removeLabel="Usuń filtr Marta">
        Marta
      </Chip>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Usuń filtr Marta" }));
    expect(remove).toHaveBeenCalledOnce();
  });
});

describe("Disc in the adult kit", () => {
  it("wears the child's tone", () => {
    const { container } = render(<Disc name="Marta" tone={3} size={24} />);
    const disc = container.querySelector<HTMLElement>("[data-slot=disc]");
    expect(disc?.textContent).toBe("M");
    expect(disc?.className).toMatch(/(^|\s)bg-jw-tone-3-fill(\s|$)/);
    expect(disc?.className).toMatch(/(^|\s)text-jw-tone-3-ink(\s|$)/);
    expect(disc?.className).toMatch(/(^|\s)size-6(\s|$)/);
    expect(disc?.className).not.toMatch(/(^|\s)(size-7|bg-jw-act-quiet)(\s|$)/);
  });

  it("draws as before with no tone and no size", () => {
    const { container } = render(<Disc name="Ola" />);
    const disc = container.querySelector<HTMLElement>("[data-slot=disc]");
    expect(disc?.className).toMatch(/(^|\s)size-7(\s|$)/);
    expect(disc?.className).toMatch(/(^|\s)bg-jw-act-quiet(\s|$)/);
  });

  it("draws Bez dziecka as an empty dashed disc", () => {
    const { container } = render(<Disc kind="none" />);
    const disc = container.querySelector<HTMLElement>("[data-slot=disc]");
    expect(disc?.textContent).toBe("");
    expect(disc?.className).toMatch(/(^|\s)border-dashed(\s|$)/);
  });

  it("draws the parent in pale ink, never a child's tone, even if given one", () => {
    const { container } = render(<Disc kind="parent" name="Anna" tone={2} />);
    const disc = container.querySelector<HTMLElement>("[data-slot=disc]");
    expect(disc?.className).toMatch(/(^|\s)bg-jw-avatar(\s|$)/);
    expect(disc?.className).not.toMatch(/jw-tone-/);
  });
});

describe("toneClasses", () => {
  it("has 10 tones and wraps any index into them", () => {
    expect(TONE_COUNT).toBe(10);
    expect(toneClasses(10)).toBe(toneClasses(0));
    expect(toneClasses(13)).toBe(toneClasses(3));
    expect(toneClasses(-1)).toBe(toneClasses(9));
    expect(new Set(Array.from({ length: 10 }, (_, i) => toneClasses(i))).size).toBe(10);
  });
});

describe("DiscStack", () => {
  const kids = ["Marta", "Ola", "Kuba", "Zosia", "Antek"].map((name, tone) => ({ name, tone }));

  it("is one named image: the first three discs, then +N", () => {
    render(<DiscStack people={kids} label="Marta, Ola, Kuba, Zosia i Antek" />);
    const stack = screen.getByRole("img", { name: "Marta, Ola, Kuba, Zosia i Antek" });
    expect(stack.querySelectorAll("[data-slot=disc]")).toHaveLength(3);
    expect(stack.textContent).toBe("MOK+2");
  });

  it("shows no +N when everyone fits", () => {
    render(<DiscStack people={kids.slice(0, 2)} label="Marta i Ola" />);
    expect(screen.getByRole("img", { name: "Marta i Ola" }).textContent).toBe("MO");
  });
});

describe("Skeleton", () => {
  it("shows only after the delay, 300 ms by default", () => {
    // Timers too, on the pinned clock the unit setup holds (Date is already FIXED_NOW).
    vi.useFakeTimers({ now: Date.now() });
    const { container } = render(<Skeleton className="h-12" />);
    expect(container.querySelector("[data-slot=skeleton]")).toBeNull();
    act(() => vi.advanceTimersByTime(299));
    expect(container.querySelector("[data-slot=skeleton]")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    const bar = container.querySelector<HTMLElement>("[data-slot=skeleton]");
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
    // The pulse only where motion is welcome.
    expect(bar?.className).toMatch(/(^|\s)motion-safe:animate-pulse(\s|$)/);
  });

  it("shows at once with no delay", () => {
    const { container } = render(<Skeleton delay={0} />);
    expect(container.querySelector("[data-slot=skeleton]")).not.toBeNull();
  });
});

describe("Empty", () => {
  it("says what is empty and offers its one action", () => {
    render(
      <Empty
        icon={<svg />}
        title="Tu będą lekcje"
        description="Napisz, czego dziecko się uczy."
        action={<button type="button">Nowa lekcja</button>}
      />,
    );
    expect(screen.getByText("Tu będą lekcje")).toBeDefined();
    expect(screen.getByText("Napisz, czego dziecko się uczy.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Nowa lekcja" })).toBeDefined();
  });
});

describe("ResultBar", () => {
  it("says the result in words and draws a segment per kind that happened", () => {
    const { container } = render(<ResultBar right={5} help={1} miss={2} label="6 z 8 dobrze" />);
    expect(screen.getByText("6 z 8 dobrze")).toBeDefined();
    const segments = [...container.querySelectorAll<HTMLElement>("[data-segment]")];
    expect(segments.map((s) => s.getAttribute("data-segment"))).toEqual(["right", "help", "miss"]);
    expect(segments.map((s) => s.style.flexGrow)).toEqual(["5", "1", "2"]);
    expect(segments[0]?.className).toMatch(/(^|\s)bg-jw-right-edge(\s|$)/);
    expect(segments[1]?.className).toMatch(/(^|\s)bg-jw-help-edge(\s|$)/);
    expect(segments[2]?.className).toMatch(/(^|\s)bg-jw-miss-edge(\s|$)/);
  });

  it("leaves out a kind with no questions", () => {
    const { container } = render(<ResultBar right={8} label="8 z 8 dobrze" />);
    expect(container.querySelectorAll("[data-segment]")).toHaveLength(1);
  });
});

describe("Pagination", () => {
  it("is a named nav with the range, the page and two named buttons", () => {
    const next = vi.fn();
    render(
      <Pagination
        label="Strony"
        range="1–20 z 214"
        page="Strona 1 z 11"
        previousLabel="Poprzednia strona"
        nextLabel="Następna strona"
        onNext={next}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Strony" })).toBeDefined();
    expect(screen.getByText("1–20 z 214")).toBeDefined();
    expect(screen.getByText("Strona 1 z 11")).toBeDefined();
    const previous = screen.getByRole("button", { name: "Poprzednia strona" });
    expect(previous.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Następna strona" }));
    expect(next).toHaveBeenCalledOnce();
  });
});
