/**
 * The adult kit's list parts (dl-uukj.47.67.5), drawn as Lekcje will draw them: the filter bar
 * (facets, Widok, Wyczyść; "Filtry (n)" and the sort below 768) over the data table (sort, select,
 * row menu, pager; two-line rows and load-more below 768), with 1 or 10 children and in each of the
 * four list states. The URL it would write shows under it. The owner's tool, so its words are typed
 * here; the app's come from copy.
 */
import {
  activeFilterWords,
  Button,
  DataTable,
  DensityScope,
  Disc,
  dataTableColumns,
  Empty,
  FilterBar,
  type FilterBarFacet,
  type LessonStatus,
  type ListQuery,
  type ListQuerySchema,
  type ListSort,
  Pagination,
  ResultBar,
  SortMenu,
  Status,
  type TableDensity,
  ViewMenu,
  writeListQuery,
} from "@jadwigo/ui";
import {
  AlertCircle,
  ArchiveIcon,
  BookOpen,
  CalendarIcon,
  Filter,
  PrinterIcon,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "../../tool/use-mobile.ts";

const NAMES = ["Marta", "Ola", "Kuba", "Zosia", "Antek", "Lena", "Staś", "Hania", "Franek", "Maja"];
const TITLES = ["Dodawanie do 20", "Ułamki na pizzy", "Zegar i godziny", "Mnożenie przez 3"];
const STATUS_WORDS: Record<LessonStatus, string> = {
  draft: "Szkic",
  ready: "Gotowa",
  "in-progress": "W trakcie",
  done: "Zrobiona",
};
const STATUSES = Object.keys(STATUS_WORDS) as LessonStatus[];
const PER_PAGE = 20;

type Lesson = {
  id: string;
  title: string;
  child: number | null;
  status: LessonStatus;
  right: number;
  day: number;
};

const LESSONS: Lesson[] = Array.from({ length: 46 }, (_, i) => ({
  id: `l${i}`,
  title: `${TITLES[i % TITLES.length]} ${Math.floor(i / TITLES.length) + 1}`,
  child: i % 7 === 6 ? null : i % NAMES.length,
  status: STATUSES[i % STATUSES.length] ?? "draft",
  right: i % 9,
  day: 31 - (i % 31),
}));

const col = dataTableColumns<Lesson>();
const childName = (l: Lesson) => (l.child === null ? "Bez dziecka" : (NAMES[l.child] ?? ""));
const when = (l: Lesson) => `${String(l.day).padStart(2, "0")} paź`;

const COLUMNS = col.columns([
  col.accessor("title", {
    header: "Lekcja",
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="font-medium">{row.original.title}</span>
        <span className="text-jw-page-small text-muted-foreground">Matematyka · 8 pytań</span>
      </span>
    ),
  }),
  col.accessor("child", {
    id: "dla",
    header: "Dla",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.child === null ? (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Disc kind="none" size={22} />
          Bez dziecka
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Disc name={childName(row.original)} tone={row.original.child} size={22} />
          {childName(row.original)}
        </span>
      ),
  }),
  col.accessor("status", {
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => (
      <Status status={row.original.status}>{STATUS_WORDS[row.original.status]}</Status>
    ),
  }),
  col.accessor("right", {
    id: "wynik",
    header: "Wynik",
    cell: ({ row }) =>
      row.original.status === "done" ? (
        <ResultBar
          right={row.original.right}
          miss={8 - row.original.right}
          label={`${row.original.right} z 8`}
        />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  }),
  col.accessor("day", {
    id: "ostatnio",
    header: "Ostatnio",
    cell: ({ row }) => <span className="tabular-nums">{when(row.original)}</span>,
  }),
]);

const SCHEMA: ListQuerySchema = {
  filters: {
    dziecko: [...NAMES.map((n) => n.toLowerCase()), "bez"],
    status: ["szkic", "gotowa", "w-trakcie", "zrobiona"],
    data: ["dzis", "tydzien", "miesiac"],
  },
  sorts: ["title", "wynik", "ostatnio"],
  defaultSort: { id: "ostatnio", desc: true },
};

type ListState = "rows" | "loading" | "first" | "error";

function Pick<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly [T, string][];
  onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([v, label]) => (
        <Button
          key={v}
          size="sm"
          variant={v === value ? "secondary" : "ghost"}
          aria-pressed={v === value}
          onClick={() => onChange(v)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

export function AdultKitC(): JSX.Element {
  const [kids, setKids] = useState<1 | 10>(10);
  const [state, setState] = useState<ListState>("rows");
  const [children, setChildren] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [date, setDate] = useState<string[]>([]);
  const [sort, setSort] = useState<ListSort | null>(SCHEMA.defaultSort ?? null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [density, setDensity] = useState<TableDensity>("comfortable");
  // A phone loads more onto the list; a laptop turns the page (S16).
  const phone = useIsMobile();

  const statusKey = (s: LessonStatus) => STATUS_WORDS[s].toLowerCase().replace(" ", "-");
  const inKids = LESSONS.filter((l) => kids === 10 || l.child === 0 || l.child === null);
  const matches = (l: Lesson, skip?: string) =>
    (skip === "dziecko" ||
      children.length === 0 ||
      children.includes(l.child === null ? "bez" : childName(l).toLowerCase())) &&
    (skip === "status" || status.length === 0 || status.includes(statusKey(l.status)));
  const filtered = inKids.filter((l) => matches(l));
  const key = sort?.id === "title" ? "title" : sort?.id === "wynik" ? "right" : "day";
  const sorted =
    sort === null
      ? filtered
      : [...filtered].sort(
          (a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (sort.desc ? -1 : 1),
        );
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const shown = sorted.slice(phone ? 0 : (page - 1) * PER_PAGE, page * PER_PAGE);
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const facets: FilterBarFacet[] = [
    {
      id: "dziecko",
      label: "Dziecko",
      hidden: kids === 1,
      options: NAMES.slice(0, kids)
        .map((name, tone) => ({
          value: name.toLowerCase(),
          label: name,
          leading: <Disc name={name} tone={tone} size={20} />,
          count: inKids.filter((l) => l.child === tone && matches(l, "dziecko")).length,
        }))
        .sort((a, b) => b.count - a.count)
        .concat({
          value: "bez",
          label: "Bez dziecka",
          leading: <Disc kind="none" size={20} />,
          count: inKids.filter((l) => l.child === null && matches(l, "dziecko")).length,
        }),
      value: children,
      onChange: (v) => reset(() => setChildren(v)),
    },
    {
      id: "status",
      label: "Status",
      options: STATUSES.map((s) => ({
        value: statusKey(s),
        label: STATUS_WORDS[s],
        count: inKids.filter((l) => l.status === s && matches(l, "status")).length,
      })),
      value: status,
      onChange: (v) => reset(() => setStatus(v)),
    },
    {
      id: "data",
      label: "Data",
      icon: <CalendarIcon aria-hidden="true" />,
      single: true,
      options: [
        { value: "dzis", label: "Dziś" },
        { value: "tydzien", label: "Ten tydzień" },
        { value: "miesiac", label: "Ten miesiąc" },
      ],
      value: date,
      onChange: (v) => reset(() => setDate(v)),
    },
  ];
  const clear = () =>
    reset(() => {
      setChildren([]);
      setStatus([]);
      setDate([]);
    });

  const query: ListQuery = { filters: { dziecko: children, status, data: date }, sort, page };
  const columns = [
    { id: "dla", label: "Dla" },
    { id: "status", label: "Status" },
    { id: "wynik", label: "Wynik" },
  ].filter((c) => kids === 10 || c.id !== "dla");
  const hiddenColumns = kids === 1 ? [...hidden, "dla"] : hidden;
  const sortValue = sort ? `${sort.desc ? "-" : ""}${sort.id}` : "";

  const empty =
    state === "error" ? (
      <Empty
        icon={<AlertCircle />}
        title="Nie udało się wczytać lekcji"
        description="Sprawdź internet. Twoje lekcje są bezpieczne."
        action={
          <Button size="control" variant="outline" onClick={() => setState("rows")}>
            Spróbuj ponownie
          </Button>
        }
      />
    ) : state === "first" ? (
      <Empty
        icon={<BookOpen />}
        title="Tu będą lekcje"
        description="Napisz, czego dziecko się uczy, albo wrzuć zdjęcie zadania."
        action={<Button size="control">Nowa lekcja</Button>}
      />
    ) : (
      <Empty
        icon={<Filter />}
        title="Nic nie pasuje do filtrów"
        description={activeFilterWords(facets)}
        action={
          <Button size="control" variant="outline" onClick={clear}>
            Wyczyść filtry
          </Button>
        }
      />
    );

  return (
    <DensityScope value="parent">
      <div
        data-audience="adult"
        data-adult-kit-c
        className="flex flex-col gap-4 rounded-jw-card border border-border bg-background p-4 text-jw-page-body text-foreground md:p-6"
      >
        <div className="flex flex-wrap items-center gap-4 text-jw-page-small text-muted-foreground">
          <Pick
            value={kids}
            onChange={(v) => reset(() => setKids(v))}
            options={[
              [1, "1 dziecko"],
              [10, "10 dzieci"],
            ]}
          />
          <Pick
            value={state}
            onChange={setState}
            options={[
              ["rows", "Wiersze"],
              ["loading", "Wczytuje"],
              ["first", "Pusta"],
              ["error", "Błąd"],
            ]}
          />
        </div>
        <FilterBar
          facets={facets}
          onClear={clear}
          labels={{
            clearChoice: "Wyczyść wybór",
            chosen: (n) => `${n} wybrane`,
            clearAll: "Wyczyść",
            filters: (n) => (n > 0 ? `Filtry (${n})` : "Filtry"),
            sheetTitle: "Filtry",
            sheetClose: "Zamknij",
            show: `Pokaż ${filtered.length} lekcji`,
          }}
          view={
            <ViewMenu
              label="Widok"
              columnsLabel="Kolumny"
              columns={columns.map((c) => ({ ...c, visible: !hidden.includes(c.id) }))}
              onColumnChange={(id, on) =>
                setHidden((h) => (on ? h.filter((x) => x !== id) : [...h, id]))
              }
              densityLabel="Gęstość"
              densities={{ comfortable: "Wygodnie", compact: "Gęsto" }}
              density={density}
              onDensityChange={setDensity}
            />
          }
          sort={
            <SortMenu
              label="Sortuj"
              value={sortValue}
              onChange={(v) =>
                setSort(v === "" ? null : { id: v.replace("-", ""), desc: v.startsWith("-") })
              }
              options={[
                { value: "-ostatnio", label: "Ostatnio, od najnowszych" },
                { value: "ostatnio", label: "Ostatnio, od najstarszych" },
                { value: "title", label: "Lekcja, A–Z" },
                { value: "-wynik", label: "Wynik, od najlepszych" },
              ]}
            />
          }
        />
        <DataTable
          label="Lekcje"
          columns={COLUMNS}
          rows={state === "rows" ? shown : []}
          getRowId={(l) => l.id}
          sort={sort}
          onSortChange={(s) => reset(() => setSort(s))}
          hiddenColumns={hiddenColumns}
          density={density}
          loading={state === "loading"}
          onRowOpen={() => {}}
          selection={{
            selected,
            onChange: setSelected,
            allLabel: "Zaznacz wszystkie",
            rowLabel: (l) => `Zaznacz: ${l.title}`,
            count: (n) => `${n} zaznaczone`,
            clearLabel: "Odznacz wszystkie",
            actions: () => (
              <>
                <Button size="sm" variant="outline">
                  <PrinterIcon aria-hidden="true" />
                  Drukuj
                </Button>
                <Button size="sm" variant="outline">
                  <ArchiveIcon aria-hidden="true" />
                  Archiwizuj
                </Button>
              </>
            ),
          }}
          rowMenu={{
            label: (l) => `Więcej: ${l.title}`,
            items: () => [
              { label: "Otwórz", onSelect: () => {} },
              { label: "Daj lekcję", onSelect: () => {} },
              { label: "Drukuj", icon: <PrinterIcon aria-hidden="true" />, onSelect: () => {} },
              { label: "Archiwizuj", icon: <ArchiveIcon aria-hidden="true" />, onSelect: () => {} },
            ],
          }}
          empty={empty}
          footer={
            <Pagination
              label="Strony"
              range={`${sorted.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, sorted.length)} z ${sorted.length}`}
              page={`Strona ${page} z ${pages}`}
              previousLabel="Poprzednia strona"
              nextLabel="Następna strona"
              onPrevious={page > 1 ? () => setPage(page - 1) : undefined}
              onNext={page < pages ? () => setPage(page + 1) : undefined}
            />
          }
          loadMore={
            page < pages ? (
              <Button size="control" variant="outline" onClick={() => setPage(page + 1)}>
                Pokaż więcej
              </Button>
            ) : undefined
          }
          phoneRow={(l) => (
            <>
              <span className="text-jw-page-body font-medium">{l.title}</span>
              <span className="text-jw-page-small text-muted-foreground">
                {[kids === 10 ? childName(l) : null, STATUS_WORDS[l.status], when(l)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </>
          )}
        />
        <code className="font-mono text-jw-page-small break-all text-muted-foreground">
          /parent/lessons?{writeListQuery(query, SCHEMA).toString()}
        </code>
      </div>
    </DensityScope>
  );
}
