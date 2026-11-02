// The adult Data Table (handoff dl-uukj.47.67 §7.2, §7.3, D11, S16, S18, S22) on TanStack Table 9: a
// bordered card, corners 8; a 36 tall stone head in the muted small; rows 52 (40 when Gęsto) with a
// stone hover and the selected row's tint. The whole row opens (a click or Enter); its checkbox and
// ⋯ don't, and a right-click (or a long press) opens the ⋯ items again. A header sorts asc → desc →
// off. The head sticks under the top bar (`stickyTop`). While rows are checked a light selection bar
// sits on top. Loading draws skeleton rows at the real height under a live head; an empty list shows
// the app's Empty. On a laptop the pager sits inside the card; below 768 the rows are two lines
// (`phoneRow`) and a load-more slot follows. The app owns the rows (already sorted and paged), the
// state and every word; this draws them.
import {
  type ColumnDef,
  type ColumnHelper,
  columnVisibilityFeature,
  createColumnHelper,
  type RowData,
  type RowSelectionState,
  rowSelectionFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
  XIcon,
} from "lucide-react";
import type { KeyboardEvent, ReactElement, ReactNode, SyntheticEvent } from "react";
import type { ListSort } from "../lib/list-query.ts";
import { PAGE_FOCUS } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { Button } from "../primitives/button.tsx";
import { Checkbox } from "../primitives/checkbox.tsx";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../primitives/context-menu.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu.tsx";
import { Skeleton } from "../primitives/skeleton.tsx";
import type { TableDensity } from "./filter-bar.tsx";

const features = tableFeatures({ rowSortingFeature, rowSelectionFeature, columnVisibilityFeature });

export type DataTableFeatures = typeof features;
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData>;

/** Typed columns for a DataTable: `const col = dataTableColumns<Lesson>(); col.columns([...])`. */
export function dataTableColumns<TData extends RowData>(): ColumnHelper<DataTableFeatures, TData> {
  return createColumnHelper<DataTableFeatures, TData>();
}

export type RowAction = { label: string; icon?: ReactNode; onSelect: () => void };

export type DataTableSelection<TData extends RowData> = {
  selected: readonly string[];
  onChange: (ids: string[]) => void;
  /** The head's checkbox: "Zaznacz wszystkie". */
  allLabel: string;
  /** A row's checkbox: "Zaznacz: Dodawanie do 20". */
  rowLabel: (row: TData) => string;
  /** The bar's count: "2 zaznaczone". */
  count: (count: number) => string;
  /** The bar's ×: "Odznacz wszystkie". */
  clearLabel: string;
  /** The bar's buttons (Drukuj, Archiwizuj), as white outline buttons. */
  actions?: (ids: string[]) => ReactNode;
};

const ROW_HEIGHT: Record<TableDensity, string> = { comfortable: "h-13", compact: "h-10" };

// A click or a key inside the checkbox or ⋯ cell (its menu's too: a portal's events bubble through
// React's tree) never reaches the row.
const stop = (e: SyntheticEvent) => e.stopPropagation();

function SortMark({ sorted }: { sorted: false | "asc" | "desc" }): ReactElement {
  if (sorted === "asc") return <ArrowUpIcon aria-hidden="true" className="size-3.5" />;
  if (sorted === "desc") return <ArrowDownIcon aria-hidden="true" className="size-3.5" />;
  return <ArrowUpDownIcon aria-hidden="true" className="size-3.5 opacity-60" />;
}

function DataTable<TData extends RowData>({
  label,
  columns,
  rows,
  getRowId,
  sort,
  onSortChange,
  hiddenColumns = [],
  density = "comfortable",
  onRowOpen,
  selection,
  rowMenu,
  loading = false,
  skeletonRows = 5,
  empty,
  footer,
  loadMore,
  phoneRow,
  stickyTop = 0,
  className,
}: {
  /** The table's name, from copy: "Lekcje". */
  label: string;
  columns: readonly DataTableColumn<TData>[];
  rows: readonly TData[];
  getRowId: (row: TData) => string;
  /** The one sorted column, or null for off. */
  sort: ListSort | null;
  onSortChange: (sort: ListSort | null) => void;
  /** Column ids Widok turned off. */
  hiddenColumns?: readonly string[];
  density?: TableDensity;
  onRowOpen?: (row: TData) => void;
  /** Given, a checkbox column and the selection bar. */
  selection?: DataTableSelection<TData>;
  /** Given, a ⋯ column, and the same items on a right-click. */
  rowMenu?: { label: (row: TData) => string; items: (row: TData) => readonly RowAction[] };
  loading?: boolean;
  skeletonRows?: number;
  /** Shown instead of the rows when there are none: the app's Empty (first time, filtered, error). */
  empty?: ReactNode;
  /** Inside the card under a laptop's rows: the Pagination. */
  footer?: ReactNode;
  /** Under a phone's rows: the load-more button. */
  loadMore?: ReactNode;
  /** A phone's two-line row (S22); without it, the phone shows the table too. */
  phoneRow?: (row: TData) => ReactNode;
  /** Where the head sticks, in px: under the 56 top bar. */
  stickyTop?: number;
  className?: string;
}): ReactElement {
  const selected = selection?.selected ?? [];
  const rowSelection: RowSelectionState = Object.fromEntries(
    selected.map((id) => [id, true] as const),
  );
  const table = useTable({
    features,
    columns: columns as DataTableColumn<TData>[],
    data: rows,
    getRowId: (row) => getRowId(row),
    // The app sorts and pages; the table keeps the cycle: asc → desc → off, one column at a time.
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: true,
    sortDescFirst: false,
    state: {
      sorting: sort ? [sort] : [],
      rowSelection,
      columnVisibility: Object.fromEntries(hiddenColumns.map((id) => [id, false] as const)),
    },
    onSortingChange: (updater) => {
      const next: SortingState =
        typeof updater === "function" ? updater(sort ? [sort] : []) : updater;
      onSortChange(next[0] ?? null);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      selection?.onChange(Object.keys(next).filter((id) => next[id]));
    },
  });

  const tableRows = table.getRowModel().rows;
  const visible = table.getVisibleLeafColumns();
  const span = visible.length + (selection ? 1 : 0) + (rowMenu ? 1 : 0);
  const rowHeight = ROW_HEIGHT[density];
  const isEmpty = !loading && rows.length === 0;

  const menuItems = (row: TData, Item: typeof DropdownMenuItem | typeof ContextMenuItem) =>
    rowMenu?.items(row).map((a) => (
      <Item key={a.label} onSelect={a.onSelect}>
        {a.icon}
        {a.label}
      </Item>
    ));

  const open = (row: TData) => (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.target === e.currentTarget) onRowOpen?.(row);
  };

  const withMenu = (key: string, row: TData, child: ReactElement) =>
    rowMenu ? (
      <ContextMenu key={key}>
        <ContextMenuTrigger asChild>{child}</ContextMenuTrigger>
        <ContextMenuContent>{menuItems(row, ContextMenuItem)}</ContextMenuContent>
      </ContextMenu>
    ) : (
      child
    );

  const allChecked = table.getIsAllRowsSelected()
    ? true
    : table.getIsSomeRowsSelected()
      ? "indeterminate"
      : false;

  return (
    <div
      data-slot="data-table"
      className={cn(
        "overflow-clip rounded-md border border-border bg-card text-jw-page-body",
        className,
      )}
    >
      {selection && selected.length > 0 && (
        <div
          data-slot="selection-bar"
          className="flex items-center gap-3 border-b border-selected-edge bg-selected px-3 py-2 text-selected-foreground"
        >
          <span className="font-medium tabular-nums">{selection.count(selected.length)}</span>
          <div className="flex items-center gap-2">{selection.actions?.([...selected])}</div>
          <Button
            variant="ghost"
            size="sm"
            aria-label={selection.clearLabel}
            onClick={() => selection.onChange([])}
            className="ml-auto px-0 text-selected-foreground hover:bg-selected-edge"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      )}
      {isEmpty ? (
        empty
      ) : (
        <>
          <table
            aria-label={label}
            aria-busy={loading || undefined}
            className={cn("w-full border-collapse", phoneRow && "max-md:hidden")}
          >
            <thead className="sticky z-10 bg-jw-side" style={{ top: stickyTop }}>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="h-9 border-b border-border">
                  {selection && (
                    <th className="w-10 px-3">
                      <Checkbox
                        aria-label={selection.allLabel}
                        checked={allChecked}
                        onCheckedChange={(on) => table.toggleAllRowsSelected(on === true)}
                        className={PAGE_FOCUS}
                      />
                    </th>
                  )}
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                        className="px-3 text-left text-jw-page-small font-medium whitespace-nowrap text-muted-foreground"
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              "-mx-1 inline-flex items-center gap-1 rounded-jw-small px-1 py-0.5 hover:text-foreground",
                              sorted && "text-foreground",
                              PAGE_FOCUS,
                            )}
                          >
                            <table.FlexRender header={header} />
                            <SortMark sorted={sorted} />
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    );
                  })}
                  {rowMenu && <th className="w-12" />}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: skeletonRows }, (_, i) => (
                    <tr key={i} className={cn(rowHeight, "border-b border-border last:border-0")}>
                      <td colSpan={span} className="px-3">
                        <Skeleton className="w-2/3" />
                      </td>
                    </tr>
                  ))
                : tableRows.map((row) =>
                    withMenu(
                      row.id,
                      row.original,
                      <tr
                        key={row.id}
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        tabIndex={onRowOpen ? 0 : undefined}
                        onClick={onRowOpen && (() => onRowOpen(row.original))}
                        onKeyDown={onRowOpen && open(row.original)}
                        className={cn(
                          rowHeight,
                          "border-b border-border transition-colors duration-jw-fast last:border-0 hover:bg-jw-side data-[state=selected]:bg-selected-row",
                          onRowOpen && "cursor-pointer",
                          PAGE_FOCUS,
                          "focus-visible:ring-inset",
                        )}
                      >
                        {selection && (
                          <td className="w-10 px-3" onClick={stop} onKeyDown={stop}>
                            <Checkbox
                              aria-label={selection.rowLabel(row.original)}
                              checked={row.getIsSelected()}
                              onCheckedChange={(on) => row.toggleSelected(on === true)}
                              className={PAGE_FOCUS}
                            />
                          </td>
                        )}
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 align-middle">
                            <table.FlexRender cell={cell} />
                          </td>
                        ))}
                        {rowMenu && (
                          <td className="w-12 px-2 text-right" onClick={stop} onKeyDown={stop}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={rowMenu.label(row.original)}
                                  className="px-0"
                                >
                                  <MoreHorizontalIcon aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {menuItems(row.original, DropdownMenuItem)}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        )}
                      </tr>,
                    ),
                  )}
            </tbody>
          </table>
          {phoneRow && (
            <ul aria-label={label} aria-busy={loading || undefined} className="md:hidden">
              {loading
                ? Array.from({ length: skeletonRows }, (_, i) => (
                    <li
                      key={i}
                      className="flex h-16 flex-col justify-center gap-2 border-b border-border px-4 last:border-0"
                    >
                      <Skeleton className="w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </li>
                  ))
                : tableRows.map((row) => (
                    <li key={row.id} className="border-b border-border last:border-0">
                      {withMenu(
                        row.id,
                        row.original,
                        <button
                          type="button"
                          onClick={onRowOpen && (() => onRowOpen(row.original))}
                          className={cn(
                            "flex min-h-16 w-full flex-col justify-center gap-0.5 px-4 py-2 text-left active:bg-jw-side",
                            PAGE_FOCUS,
                            "focus-visible:ring-inset",
                          )}
                        >
                          {phoneRow(row.original)}
                        </button>,
                      )}
                    </li>
                  ))}
            </ul>
          )}
          {footer !== undefined && (
            <div className={cn("border-t border-border px-3 py-2", phoneRow && "max-md:hidden")}>
              {footer}
            </div>
          )}
          {loadMore !== undefined && (
            <div className="flex justify-center border-t border-border p-3 md:hidden">
              {loadMore}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { DataTable };
