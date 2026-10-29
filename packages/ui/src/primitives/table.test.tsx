// @vitest-environment happy-dom
// The Table renders its rows and cells as a real table a screen reader can walk, inside a wrapper
// that scrolls sideways (dl-uukj.30.3). happy-dom does no layout, so the wrapper's class is the check.
import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.tsx";

afterEach(cleanup);

describe("Table", () => {
  it("renders its header, rows, cells, footer and caption", () => {
    const { getByRole } = render(
      <Table>
        <TableCaption>Pytanie po pytaniu</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Kto</TableHead>
            <TableHead>1</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Uczestnik 1</TableCell>
            <TableCell>Od razu</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Uczestnik 2</TableCell>
            <TableCell>Jeszcze nie</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Od razu</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    const table = getByRole("table", { name: "Pytanie po pytaniu" });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Kto", "1"]);
    expect(within(table).getAllByRole("cell")).toHaveLength(6);
    expect(within(table).getByRole("cell", { name: "Jeszcze nie" })).toBeTruthy();
  });

  it("scrolls a wide grid inside its wrapper, not the page", () => {
    const { getByRole } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>1</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const wrapper = getByRole("table").parentElement;
    expect(wrapper?.getAttribute("data-slot")).toBe("table-container");
    expect(wrapper?.className).toMatch(/(^|\s)overflow-x-auto(\s|$)/);
  });
});
