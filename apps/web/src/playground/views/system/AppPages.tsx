/**
 * The System page's App pages section (dl-uukj.32.12): a parent's pages as the app draws them, from
 * @jadwigo/ui's parts, with the app-page register's values read live beside them. The parent's
 * home shows option 1b of the owner's answers (dl-uukj.32.19): one compact card per finished
 * lesson, with a row of small outcome tiles in the parent's icon set.
 *
 * It sits outside [data-lesson-theme], so none of the lesson's behaviour rules reach it: what shows
 * here is what an app page shows at :root. The System page's [theme] wrapper declares Zeszyt's
 * aliases again over the playground's neutral chrome (tool/neutral.css), and font-sans takes
 * Zeszyt's face back from the chrome's.
 */

import { copy } from "@jadwigo/copy";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Heading,
  Input,
  Link,
  Notice,
  OutcomeTile,
  Page,
} from "@jadwigo/ui";
import { Info } from "lucide-react";
import { useRef } from "react";
import { APP_PAGE_ROLES, PARENT_OUTCOMES } from "./data.ts";
import { isColour, useLiveValues } from "./live.ts";

/** A parent outcome's word, in the adult's Polish. */
const word = (key: (typeof PARENT_OUTCOMES)[number]["word"]): string =>
  copy("pl", key, {}, "adult");

const outcome = (name: string): (typeof PARENT_OUTCOMES)[number] => {
  const found = PARENT_OUTCOMES.find((o) => o.outcome === name);
  if (found === undefined) throw new Error(`no parent outcome ${name}`);
  return found;
};

/** The home card's lesson: one tile per question, in the order they were asked. */
const HOME_TILES = ["first_try", "got_there", "not_yet", "first_try", "skipped", "not_asked"].map(
  (name, i) => ({ n: i + 1, ...outcome(name) }),
);

/** The finished lesson's questions: one per tone a tile wears there. */
const QUESTIONS = [
  { say: "6 × 7", ...outcome("first_try") },
  { say: "8 × 9", ...outcome("not_yet") },
  { say: "7 × 7", ...outcome("skipped") },
];

const FRAME = "min-w-0 rounded-2xl border-2 border-border bg-jw-ground";

/** The parent's home, option 1b: a child's name, then a compact card per finished lesson. */
function Home(): JSX.Element {
  return (
    <div className={FRAME}>
      <Page width="prose" role="region" aria-label="The parent's home, drawn by the kit">
        <Heading level={1}>Konto rodzica</Heading>
        <Heading level={2}>Uczestnik 1</Heading>
        <Card size="compact" data-home-card>
          <CardContent className="flex flex-col items-start gap-2">
            <Link href="#app-pages">Równe grupy</Link>
            <p className="text-jw-small text-jw-ink-soft">30 października 2026</p>
            <ul className="flex flex-wrap gap-2 pt-1" aria-label="Równe grupy: pytania">
              {HOME_TILES.map((t) => {
                const Icon = t.icon;
                return (
                  <li key={t.n}>
                    <OutcomeTile
                      tone={t.tone}
                      outcome={t.outcome}
                      size="sm"
                      icon={<Icon aria-hidden />}
                      label={`Pytanie ${t.n}: ${word(t.word)}`}
                    />
                  </li>
                );
              })}
            </ul>
            <Link href="#app-pages" size="small">
              {copy("pl", "parent_overview_link", {}, "adult")}
            </Link>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="control">
            Dodaj dziecko
          </Button>
          <Button variant="outline" size="control">
            Wyloguj się
          </Button>
        </div>
      </Page>
    </div>
  );
}

/** A finished lesson and the sign-in form, from the kit's parts alone. */
function Lesson(): JSX.Element {
  return (
    <div className={FRAME}>
      <Page width="prose" role="region" aria-label="A parent's page, drawn by the kit">
        <Heading level={1}>Tabliczka mnożenia</Heading>
        <p>Ostatnia próba: 3 pytania, 1 od razu.</p>
        <Heading level={2}>Pytania</Heading>
        <ul className="flex flex-col gap-3">
          {QUESTIONS.map((q) => {
            const Icon = q.icon;
            return (
              <li key={q.say}>
                <Card size="compact">
                  <CardHeader className="flex items-center gap-3">
                    <OutcomeTile
                      tone={q.tone}
                      outcome={q.outcome}
                      icon={<Icon aria-hidden />}
                      label={`${q.say}: ${word(q.word)}`}
                    />
                    <CardTitle>{q.say}</CardTitle>
                  </CardHeader>
                  <CardContent>{word(q.word)}</CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
        <Heading level={3}>Zapisz postęp</Heading>
        <Field label="Adres e-mail">
          <Input kind="text" type="email" placeholder="rodzic@example.com" />
        </Field>
        <Button size="control" className="self-start">
          Wyślij kod
        </Button>
        <Notice icon={<Info />}>Kod wysłaliśmy na podany adres.</Notice>
        <Link href="#app-pages">Wróć do listy lekcji</Link>
      </Page>
    </div>
  );
}

export function AppPages({ mode }: { mode: string }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const values = useLiveValues(
    root,
    APP_PAGE_ROLES.map((r) => r.token),
    mode,
  );
  return (
    <div
      ref={root}
      data-app-pages
      className="grid gap-6 font-sans xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <Home />
        <Lesson />
      </div>
      <table className="h-fit w-full text-left text-sm" aria-label="The app-page register, live">
        <thead className="text-muted-foreground">
          <tr>
            <th className="pb-2 font-normal">Part</th>
            <th className="pb-2 font-normal">Token, read live</th>
          </tr>
        </thead>
        <tbody>
          {APP_PAGE_ROLES.map((r) => {
            const value = values[r.token] ?? "";
            return (
              <tr key={r.token} data-app-role={r.token} className="border-t border-border">
                <td className="py-2 pr-3 align-top">
                  <span className="block font-bold">{r.part}</span>
                  <span className="text-muted-foreground">{r.what}</span>
                </td>
                <td className="py-2 align-top">
                  <code className="block">{r.token}</code>
                  <span className="flex items-center gap-2 tabular-nums" data-live-value>
                    {isColour(value) && (
                      <span
                        aria-hidden
                        className="size-4 shrink-0 rounded-full border-2 border-border"
                        // The swatch shows the value it names, read live: no utility per token.
                        style={{ background: `var(${r.token})` }}
                      />
                    )}
                    {value}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
