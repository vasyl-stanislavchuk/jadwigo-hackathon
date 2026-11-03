// A list's filters, sort and page in the URL's query (handoff dl-uukj.47.67 S15, §7.1):
// `?dziecko=marta,ola&status=zrobiona&sort=-ostatnio&strona=2`. Back restores a view and a filtered
// view can be bookmarked. Pure: the app reads `location.search` and writes what this returns. A value
// the schema doesn't list (an old bookmark, a hand-typed link) is dropped, never an error.

/** One sorted column: TanStack Table's ColumnSort. */
export type ListSort = { id: string; desc: boolean };

export type ListQuery = {
  /** Each facet's picked values, by its query key. A facet with none is absent. */
  filters: Record<string, string[]>;
  /** Null is "off": the list in the order it arrives. */
  sort: ListSort | null;
  /** From 1. */
  page: number;
};

export type ListQuerySchema = {
  /** Each facet's query key and the values it may hold. */
  filters: Record<string, readonly string[]>;
  /** The column ids a list may sort by. */
  sorts: readonly string[];
  /** The sort a bare URL means (S16: Ostatnio, newest first). */
  defaultSort?: ListSort;
};

export const SORT_PARAM = "sort";
export const PAGE_PARAM = "strona";

function readSort(raw: string | null, schema: ListQuerySchema): ListSort | null {
  // No param is the default; an empty one is an explicit "off" (only written when a default exists).
  if (raw === null) return schema.defaultSort ?? null;
  const desc = raw.startsWith("-");
  const id = desc ? raw.slice(1) : raw;
  if (!schema.sorts.includes(id)) return raw === "" ? null : (schema.defaultSort ?? null);
  return { id, desc };
}

export function readListQuery(
  search: string | URLSearchParams,
  schema: ListQuerySchema,
): ListQuery {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const filters: Record<string, string[]> = {};
  for (const [key, allowed] of Object.entries(schema.filters)) {
    const picked = (params.get(key) ?? "")
      .split(",")
      .filter((value, i, all) => allowed.includes(value) && all.indexOf(value) === i);
    if (picked.length > 0) filters[key] = picked;
  }
  const page = Number(params.get(PAGE_PARAM));
  return {
    filters,
    sort: readSort(params.get(SORT_PARAM), schema),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

const sameSort = (a: ListSort | null, b: ListSort | null) =>
  a === b || (a !== null && b !== null && a.id === b.id && a.desc === b.desc);

/**
 * The query for `query`, on top of `base` (the page's other params, kept). Defaults are left out, so
 * a fresh list's URL stays bare: no page 1, no default sort.
 */
export function writeListQuery(
  query: ListQuery,
  schema: ListQuerySchema,
  base: string | URLSearchParams = "",
): URLSearchParams {
  const params = new URLSearchParams(base);
  for (const key of Object.keys(schema.filters)) {
    const values = query.filters[key] ?? [];
    if (values.length > 0) params.set(key, values.join(","));
    else params.delete(key);
  }
  const fallback = schema.defaultSort ?? null;
  if (sameSort(query.sort, fallback)) params.delete(SORT_PARAM);
  else
    params.set(
      SORT_PARAM,
      query.sort === null ? "" : `${query.sort.desc ? "-" : ""}${query.sort.id}`,
    );
  if (query.page > 1) params.set(PAGE_PARAM, String(query.page));
  else params.delete(PAGE_PARAM);
  return params;
}
