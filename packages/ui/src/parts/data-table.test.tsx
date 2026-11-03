// @vitest-environment happy-dom
// The adult Data Table (dl-uukj.47.67.5, §7.2, S16, S18): the sort cycle, the selection bar, what
// opens a row and what doesn't, and the loading and empty states. happy-dom does no layout, so the
// sticky head and the phone's rows are the e2e's.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListSort } from "../lib/list-query.ts";
import { DensityScope } from "../lib/register.tsx";
import { DataTable, type DataTableSelection, dataTableColumns } from "./data-table.tsx";

type Lesson = { id: string; title: string; when: string };
const LESSONS: Lesson[] = [
  { id: "a", title: "Dodawanie", when: "02 lis" },
  { id: "b", title: "Ułamki", when: "01 lis" },
];
const col = dataTableColumns<Lesson>();
const COLUMNS = col.columns([
  col.accessor("title", { header: "Lekcja" }),
  col.accessor("when", { id: "ostatnio", header: "Ostatnio" }),
]);

function Harness({
  onOpen = () => {},
  onArchive = () => {},
  rows = LESSONS,
  loading = false,
}: {
  onOpen?: (l: Lesson) => void;
  onArchive?: () => void;
  rows?: Lesson[];
  loading?: boolean;
}): JSX.Element {
  const [sort, setSort] = useState<ListSort | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const selection: DataTableSelection<Lesson> = {
    selected,
    onChange: setSelected,
    allLabel: "Zaznacz wszystkie",
    rowLabel: (l) => `Zaznacz: ${l.title}`,
    count: (n) => `${n} zaznaczone`,
    clearLabel: "Odznacz wszystkie",
  };
  return (
    <DensityScope value="parent">
      <div data-audience="adult">
        <output data-testid="sort">{sort ? `${sort.desc ? "-" : ""}${sort.id}` : "off"}</output>
        <DataTable
          label="Lekcje"
          columns={COLUMNS}
          rows={rows}
          getRowId={(l) => l.id}
          sort={sort}
          onSortChange={setSort}
          onRowOpen={onOpen}
          selection={selection}
          rowMenu={{
            label: (l) => `Więcej: ${l.title}`,
            items: () => [{ label: "Archiwizuj", onSelect: onArchive }],
          }}
          loading={loading}
          empty={<p>Tu będą lekcje</p>}
        />
      </div>
    </DensityScope>
  );
}

afterEach(cleanup);

describe("DataTable", () => {
  it("cycles a column's sort asc → desc → off", () => {
    render(<Harness />);
    const head = screen.getByRole("button", { name: "Lekcja" });
    const sort = screen.getByTestId("sort");
    fireEvent.click(head);
    expect(sort.textContent).toBe("title");
    expect(screen.getByRole("columnheader", { name: "Lekcja" }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    fireEvent.click(head);
    expect(sort.textContent).toBe("-title");
    fireEvent.click(head);
    expect(sort.textContent).toBe("off");
  });

  it("shows the selection bar only while rows are checked", () => {
    render(<Harness />);
    expect(screen.queryByText(/zaznaczone/)).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Zaznacz: Dodawanie" }));
    expect(screen.getByText("1 zaznaczone")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Zaznacz wszystkie" }));
    expect(screen.getByText("2 zaznaczone")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Odznacz wszystkie" }));
    expect(screen.queryByText(/zaznaczone/)).toBeNull();
  });

  it("opens a row by a click or Enter, but not from its checkbox or its ⋯", async () => {
    const onOpen = vi.fn();
    const onArchive = vi.fn();
    render(<Harness onOpen={onOpen} onArchive={onArchive} />);
    const row = screen.getByRole("row", { name: /Dodawanie/ });
    fireEvent.click(within(row).getByText("Dodawanie"));
    expect(onOpen).toHaveBeenCalledWith(LESSONS[0]);
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(2);

    fireEvent.click(within(row).getByRole("checkbox"));
    const more = within(row).getByRole("button", { name: "Więcej: Dodawanie" });
    fireEvent.keyDown(more, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Archiwizuj" }));
    expect(onArchive).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("repeats the ⋯ items on a right-click", async () => {
    const onArchive = vi.fn();
    render(<Harness onArchive={onArchive} />);
    fireEvent.contextMenu(screen.getByRole("row", { name: /Ułamki/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Archiwizuj" }));
    expect(onArchive).toHaveBeenCalledOnce();
  });

  it("keeps the head live while loading, and shows the app's empty state with no rows", () => {
    const { rerender } = render(<Harness loading />);
    expect(screen.getByRole("table", { name: "Lekcje" }).getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("button", { name: "Lekcja" })).toBeTruthy();
    expect(screen.queryByText("Dodawanie")).toBeNull();
    rerender(<Harness rows={[]} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Tu będą lekcje")).toBeTruthy();
  });
});
