/**
 * The adult kit's display parts (dl-uukj.47.67.4), drawn as the parent app draws them: inside the
 * parent's density and the adult audience. Status pills, count and tag badges, filter chips, discs in
 * all 10 child tones, the parent's avatar, "Bez dziecka", a stack, skeleton rows, the empty states,
 * result bars, the pager and the breadcrumb. The owner's tool, so its words are typed here.
 */
import {
  Badge,
  Breadcrumb,
  Button,
  Chip,
  DensityScope,
  Disc,
  DiscStack,
  Empty,
  Pagination,
  ResultBar,
  Skeleton,
  Status,
  TONE_COUNT,
} from "@jadwigo/ui";
import { AlertCircle, BookOpen, Filter } from "lucide-react";
import type { ReactNode } from "react";

const NAMES = ["Marta", "Ola", "Kuba", "Zosia", "Antek", "Lena", "Staś", "Hania", "Franek", "Maja"];

function Row({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-jw-page-small text-muted-foreground">{title}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function AdultKitB(): JSX.Element {
  return (
    <DensityScope value="parent">
      <div
        data-audience="adult"
        data-adult-kit-b
        className="flex flex-col gap-6 rounded-jw-card border border-border bg-background p-6 text-jw-page-body text-foreground"
      >
        <Row title="Status">
          <Status status="draft">Szkic</Status>
          <Status status="ready">Gotowa</Status>
          <Status status="in-progress">W trakcie</Status>
          <Status status="done">Zrobiona</Status>
        </Row>
        <Row title="Count, tag, chip">
          <Badge variant="count">2</Badge>
          <Badge variant="count">38</Badge>
          <Badge variant="tag">klasa 3</Badge>
          <Chip>Marta</Chip>
          <Chip onRemove={() => {}} removeLabel="Usuń filtr Ola">
            Ola
          </Chip>
        </Row>
        <Row title="Child tones (0-9), 32 and 22">
          {NAMES.slice(0, TONE_COUNT).map((name, i) => (
            <span key={name} className="flex items-center gap-1.5">
              <Disc name={name} tone={i} size={32} />
              <Disc name={name} tone={i} size={22} />
              <span>{name}</span>
            </span>
          ))}
        </Row>
        <Row title="Parent, Bez dziecka, sizes 20 / 22 / 24 / 32, stack">
          <Disc kind="parent" name="Anna" size={32} />
          <Disc kind="parent" name="Anna" size={24} />
          <span className="flex items-center gap-1.5">
            <Disc kind="none" size={22} />
            <span className="text-muted-foreground">Bez dziecka</span>
          </span>
          <Disc name="Marta" tone={0} size={20} />
          <Disc name="Marta" tone={0} size={22} />
          <Disc name="Marta" tone={0} size={24} />
          <Disc name="Marta" tone={0} size={32} />
          <DiscStack
            people={NAMES.slice(0, 5).map((name, tone) => ({ name, tone }))}
            label="Marta, Ola, Kuba, Zosia i Antek"
          />
        </Row>
        <Row title="Result bar">
          <ResultBar right={5} help={1} miss={2} label="6 z 8 dobrze" />
          <ResultBar right={8} label="8 z 8 dobrze" />
          <ResultBar right={2} help={3} miss={5} label="5 z 10 dobrze" />
        </Row>
        <Row title="Breadcrumb">
          <Breadcrumb
            label="Ścieżka"
            trail={[{ label: "Lekcje", href: "#adult-kit-b" }, { label: "Ułamki na pizzy" }]}
          />
        </Row>
        <Row title="Skeleton (after 300 ms)">
          <div className="flex w-full max-w-xl flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        </Row>
        <div className="grid gap-4 rounded-jw-card border border-border md:grid-cols-3">
          <Empty
            icon={<BookOpen />}
            title="Tu będą lekcje"
            description="Napisz, czego dziecko się uczy, albo wrzuć zdjęcie zadania."
            action={<Button size="control">Nowa lekcja</Button>}
          />
          <Empty
            icon={<Filter />}
            title="Nic nie pasuje do filtrów"
            description="Marta, Ola · Zrobiona · październik"
            action={
              <Button size="control" variant="outline">
                Wyczyść filtry
              </Button>
            }
          />
          <Empty
            icon={<AlertCircle />}
            title="Nie udało się wczytać lekcji"
            description="Sprawdź internet. Twoje lekcje są bezpieczne."
            action={
              <Button size="control" variant="outline">
                Spróbuj ponownie
              </Button>
            }
          />
        </div>
        <Pagination
          label="Strony"
          range="1–20 z 214"
          page="Strona 1 z 11"
          perPage={<span>Na stronie 20</span>}
          previousLabel="Poprzednia strona"
          nextLabel="Następna strona"
          onNext={() => {}}
        />
      </div>
    </DensityScope>
  );
}
