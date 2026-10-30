/**
 * The System page's App pages section (dl-uukj.32.12): a parent's page as the app draws it, from
 * @jadwigo/ui's parts, with the app-page register's values read live beside it.
 *
 * It sits outside [data-lesson-theme], so none of the lesson's behaviour rules reach it: what shows
 * here is what an app page shows at :root. The System page's [theme] wrapper declares Zeszyt's
 * aliases again over the playground's neutral chrome (tool/neutral.css), and font-sans takes
 * Zeszyt's face back from the chrome's.
 */

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
import { ENDED_ICON, ENDED_TONE, type EndedOrOpen } from "../../../review/outcome.ts";
import { APP_PAGE_ROLES } from "./data.ts";
import { isColour, useLiveValues } from "./live.ts";

/** The specimen's questions: one per tone a tile wears. */
const QUESTIONS: readonly { say: string; ended: EndedOrOpen; word: string }[] = [
  { say: "6 × 7", ended: "correct", word: "Dobrze" },
  { say: "8 × 9", ended: "missed", word: "Jeszcze nie" },
  { say: "7 × 7", ended: "skipped", word: "Pominięte" },
];

/** A parent's page, from the kit's parts alone. */
function Specimen(): JSX.Element {
  return (
    <div className="min-w-0 rounded-2xl border-2 border-border bg-jw-ground">
      <Page width="prose" role="region" aria-label="A parent's page, drawn by the kit">
        <Heading level={1}>Tabliczka mnożenia</Heading>
        <p>Ostatnia próba: 3 pytania, 1 od razu.</p>
        <Heading level={2}>Pytania</Heading>
        <ul className="flex flex-col gap-3">
          {QUESTIONS.map((q) => {
            const Icon = ENDED_ICON[q.ended];
            return (
              <li key={q.say}>
                <Card size="compact">
                  <CardHeader className="flex items-center gap-3">
                    <OutcomeTile
                      tone={ENDED_TONE[q.ended]}
                      outcome={q.ended}
                      icon={<Icon aria-hidden />}
                      label={`${q.say}: ${q.word}`}
                    />
                    <CardTitle>{q.say}</CardTitle>
                  </CardHeader>
                  <CardContent>{q.word}</CardContent>
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
      <Specimen />
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
