/**
 * The one list pattern Lekcje and Historia share (handoff dl-uukj.47.67 §7, D8, D9, D11, S14-S18):
 * the kit's FilterBar over its DataTable, no header row above them. Every filter, the sort and the
 * page live in the URL (`?dziecko=marta&data=tydzien&sort=-ostatnio&strona=2`), written with replace
 * so the address always says what shows. The rows arrive whole; this filters, sorts and pages them
 * here, 20 to a page on a laptop and "Pokaż więcej" on a phone. It draws the four states: skeleton
 * rows after 300 ms, empty the first time, empty under the filters, and the error with a retry.
 * Widok's columns and density are kept per device.
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  activeFilterWords,
  Button,
  DataTable,
  type DataTableColumn,
  Empty,
  FilterBar,
  type FilterBarFacet,
  type ListQuery,
  type ListSort,
  Pagination,
  type RowAction,
  readListQuery,
  SortMenu,
  type TableDensity,
  ViewMenu,
  writeListQuery,
} from "@jadwigo/ui";
import { AlertCircle, BookOpen, Filter } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { navigate, useLocation } from "../../nav/location.ts";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { parentPath } from "../route.ts";
import { NO_CHILD } from "./filter.ts";
import { usePhone } from "./usePhone.ts";

const PER_PAGE = 20;

/** One facet of the list: its options, and whether a row shows under one picked value. */
export interface ListFacet<T> {
  id: string;
  label: string;
  icon?: ReactNode;
  single?: boolean;
  hidden?: boolean;
  options: readonly { value: string; label: string; leading?: ReactNode }[];
  has: (row: T, value: string) => boolean;
  /** Sort the options by count, Bez dziecka kept last. */
  byCount?: boolean;
}

/** Widok's choices on this device; a private window or blocked storage keeps the defaults. */
function useView(key: string): {
  hidden: string[];
  density: TableDensity;
  setHidden: (hidden: string[]) => void;
  setDensity: (density: TableDensity) => void;
} {
  const storeKey = `jadwigo.list.${key}`;
  const [view, setView] = useState<{ hidden: string[]; density: TableDensity }>(() => {
    try {
      const held = JSON.parse(window.localStorage.getItem(storeKey) ?? "null");
      if (
        Array.isArray(held?.hidden) &&
        (held.density === "compact" || held.density === "comfortable")
      )
        return {
          hidden: held.hidden.filter((id: unknown) => typeof id === "string"),
          density: held.density,
        };
    } catch {}
    return { hidden: [], density: "comfortable" };
  });
  const save = (next: typeof view): void => {
    setView(next);
    try {
      window.localStorage.setItem(storeKey, JSON.stringify(next));
    } catch {}
  };
  return {
    ...view,
    setHidden: (hidden) => save({ ...view, hidden }),
    setDensity: (density) => save({ ...view, density }),
  };
}

/** True once `waiting` has held for 300 ms: a fast answer never flashes the skeleton (S18). */
function useSlow(waiting: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!waiting) return;
    const timer = setTimeout(() => setSlow(true), 300);
    return () => clearTimeout(timer);
  }, [waiting]);
  return slow;
}

export function ListView<T extends object>({
  language,
  label,
  rows,
  getRowId,
  columns,
  viewColumns,
  hiddenColumns,
  facets,
  sorts,
  defaultSort,
  sortOptions,
  onOpen,
  rowMenu,
  rowTitle,
  selectionActions,
  phoneRow,
  first,
  failedTitle,
  onRetry,
  storeKey,
}: {
  language: Language;
  /** The table's name: "Lekcje". */
  label: string;
  /** Every row, whole; "failed" when the read failed; null while it is read. */
  rows: readonly T[] | "failed" | null;
  getRowId: (row: T) => string;
  columns: readonly DataTableColumn<T>[];
  /** The columns Widok may turn off. */
  viewColumns: readonly { id: string; label: string }[];
  /** Columns that never show here (S17: no Dla with one child). */
  hiddenColumns: readonly string[];
  facets: readonly ListFacet<T>[];
  /** Each sortable column's order, ascending. */
  sorts: Readonly<Record<string, (a: T, b: T) => number>>;
  defaultSort: ListSort;
  /** The phone's Sortuj menu. */
  sortOptions: readonly { value: string; label: string }[];
  onOpen: (row: T) => void;
  rowMenu: (row: T) => readonly RowAction[];
  rowTitle: (row: T) => string;
  /** Given, a checkbox per row and these buttons in the selection bar. */
  selectionActions?: (ids: string[], clear: () => void) => ReactNode;
  phoneRow: (row: T) => ReactNode;
  first: { title: string; line: string };
  failedTitle: string;
  onRetry: () => void;
  /** Where Widok keeps its choices on this device. */
  storeKey: string;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string | number> = {}): string =>
    copy(language, key, vars, CATEGORY);
  const { path, query } = useLocation();
  const phone = usePhone();
  const view = useView(storeKey);
  const slow = useSlow(rows === null);
  const [selected, setSelected] = useState<string[]>([]);

  const schema = {
    filters: Object.fromEntries(facets.map((f) => [f.id, f.options.map((o) => o.value)])),
    sorts: Object.keys(sorts),
    defaultSort,
  };
  const list = readListQuery(query, schema);
  const go = (next: ListQuery): void => {
    const search = writeListQuery(next, schema, query).toString();
    navigate(search === "" ? path : `${path}?${search}`, { replace: true });
  };
  const picked = (id: string): string[] => list.filters[id] ?? [];

  const all = Array.isArray(rows) ? rows : [];
  const matches = (row: T, skip?: string): boolean =>
    facets.every(
      (f) => f.id === skip || picked(f.id).length === 0 || picked(f.id).some((v) => f.has(row, v)),
    );
  const filtered = all.filter((row) => matches(row));
  const order = list.sort === null ? undefined : sorts[list.sort.id];
  const desc = list.sort?.desc === true;
  const sorted = order
    ? [...filtered].sort((a, b) => (desc ? order(b, a) : order(a, b)))
    : filtered;
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(list.page, pages);
  const shown = sorted.slice(phone ? 0 : (page - 1) * PER_PAGE, page * PER_PAGE);

  const barFacets: FilterBarFacet[] = facets.map((f) => {
    const options = f.options.map((o) => ({
      ...o,
      count: all.filter((row) => f.has(row, o.value) && matches(row, f.id)).length,
    }));
    if (f.byCount)
      options.sort(
        (a, b) => Number(a.value === NO_CHILD) - Number(b.value === NO_CHILD) || b.count - a.count,
      );
    return {
      id: f.id,
      label: f.label,
      ...(f.icon === undefined ? {} : { icon: f.icon }),
      ...(f.single === undefined ? {} : { single: f.single }),
      ...(f.hidden === undefined ? {} : { hidden: f.hidden }),
      options,
      value: picked(f.id),
      onChange: (value) => go({ ...list, filters: { ...list.filters, [f.id]: value }, page: 1 }),
    };
  });
  const clear = (): void => go({ ...list, filters: {}, page: 1 });

  const ids = new Set(all.map(getRowId));
  const checked = selected.filter((id) => ids.has(id));
  const sortValue = list.sort === null ? "" : `${list.sort.desc ? "-" : ""}${list.sort.id}`;

  const empty =
    rows === "failed" ? (
      <Empty
        icon={<AlertCircle />}
        title={failedTitle}
        description={t("parent_list_failed_line")}
        action={
          <Button size="control" variant="outline" onClick={onRetry} data-list-retry>
            {t("parent_list_retry")}
          </Button>
        }
      />
    ) : all.length === 0 ? (
      <Empty
        icon={<BookOpen />}
        title={first.title}
        description={first.line}
        action={
          <Button asChild size="control">
            <NavLink href={parentPath({ lang: pageLang() })} data-list-new-lesson>
              {t("parent_new_lesson")}
            </NavLink>
          </Button>
        }
      />
    ) : (
      <Empty
        icon={<Filter />}
        title={t("parent_list_filtered_title")}
        description={activeFilterWords(barFacets)}
        action={
          <Button size="control" variant="outline" onClick={clear} data-list-clear>
            {t("parent_list_clear_filters")}
          </Button>
        }
      />
    );

  const from = sorted.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  return (
    <section className="flex w-full flex-col gap-4" data-list={storeKey}>
      <FilterBar
        facets={barFacets}
        onClear={clear}
        labels={{
          clearChoice: t("parent_list_clear_choice"),
          chosen: (n) => t("parent_list_chosen", { n }),
          clearAll: t("parent_list_clear"),
          filters: (n) =>
            n > 0 ? t("parent_list_filters_count", { n }) : t("parent_list_filters"),
          sheetTitle: t("parent_list_filters"),
          sheetClose: t("parent_list_close"),
          show: t("parent_list_show", { n: filtered.length }),
        }}
        view={
          <ViewMenu
            label={t("parent_list_view")}
            columnsLabel={t("parent_list_columns")}
            columns={viewColumns
              .filter((c) => !hiddenColumns.includes(c.id))
              .map((c) => ({ ...c, visible: !view.hidden.includes(c.id) }))}
            onColumnChange={(id, on) =>
              view.setHidden(on ? view.hidden.filter((x) => x !== id) : [...view.hidden, id])
            }
            densityLabel={t("parent_list_density")}
            densities={{
              comfortable: t("parent_list_comfortable"),
              compact: t("parent_list_compact"),
            }}
            density={view.density}
            onDensityChange={view.setDensity}
          />
        }
        sort={
          <SortMenu
            label={t("parent_list_sort")}
            value={sortValue}
            onChange={(v) =>
              go({
                ...list,
                sort: v === "" ? null : { id: v.replace(/^-/, ""), desc: v.startsWith("-") },
                page: 1,
              })
            }
            options={sortOptions}
          />
        }
      />
      {(rows !== null || slow) && (
        <DataTable
          label={label}
          columns={columns}
          rows={rows === "failed" ? [] : shown}
          getRowId={getRowId}
          sort={list.sort}
          onSortChange={(sort) => go({ ...list, sort, page: 1 })}
          hiddenColumns={[...hiddenColumns, ...view.hidden]}
          density={view.density}
          loading={rows === null}
          onRowOpen={onOpen}
          {...(selectionActions === undefined
            ? {}
            : {
                selection: {
                  selected: checked,
                  onChange: setSelected,
                  allLabel: t("parent_list_select_all"),
                  rowLabel: (row: T) => t("parent_list_select_row", { title: rowTitle(row) }),
                  count: (n: number) => t("parent_list_selected", { n }),
                  clearLabel: t("parent_list_unselect"),
                  actions: (chosen: string[]) => selectionActions(chosen, () => setSelected([])),
                },
              })}
          rowMenu={{
            label: (row) => t("parent_list_more", { title: rowTitle(row) }),
            items: rowMenu,
          }}
          empty={empty}
          footer={
            <Pagination
              label={t("parent_list_pages")}
              range={t("parent_list_range", {
                from,
                to: Math.min(page * PER_PAGE, sorted.length),
                total: sorted.length,
              })}
              page={t("parent_list_page", { page, pages })}
              previousLabel={t("parent_list_previous")}
              nextLabel={t("parent_list_next")}
              onPrevious={page > 1 ? () => go({ ...list, page: page - 1 }) : undefined}
              onNext={page < pages ? () => go({ ...list, page: page + 1 }) : undefined}
            />
          }
          loadMore={
            page < pages ? (
              <Button
                size="control"
                variant="outline"
                onClick={() => go({ ...list, page: page + 1 })}
                data-list-more
              >
                {t("parent_list_load_more")}
              </Button>
            ) : undefined
          }
          phoneRow={phoneRow}
        />
      )}
    </section>
  );
}
