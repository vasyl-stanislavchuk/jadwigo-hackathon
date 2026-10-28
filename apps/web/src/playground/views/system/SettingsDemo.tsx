/**
 * The System page's settings controls (the fourth export's forms and navigation), each one live,
 * with the export's own examples. playground/views/system/settings.tsx draws them.
 */

import { BookOpen, Calculator, Moon, Palette, Volume2 } from "lucide-react";
import { useState } from "react";
import { Sub } from "./Foundations.tsx";
import { RadioGroup, SegmentedControl, SideMenu, Switch, Tabs } from "./settings.tsx";

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-3 rounded-2xl border-2 border-border bg-background p-5">
    {children}
  </div>
);

export function Settings(): JSX.Element {
  const [voice, setVoice] = useState("calm");
  const [sound, setSound] = useState(true);
  const [night, setNight] = useState(false);
  const [level, setLevel] = useState("medium");
  const [subject, setSubject] = useState("maths");
  const [page, setPage] = useState("sound");
  const [doc, setDoc] = useState("przelacznik");
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
        <Sub
          title="Radio group"
          lead="One choice from two to five. The whole row is the target; arrows move and choose."
        >
          <Card>
            <RadioGroup
              label="Głos lektora"
              value={voice}
              onChange={setVoice}
              options={[
                { value: "calm", label: "Spokojny" },
                { value: "lively", label: "Żywy" },
                { value: "slow", label: "Wolniejszy" },
              ]}
            />
          </Card>
        </Sub>
        <Sub
          title="Switch"
          lead="On or off, at once. The row toggles; Space toggles from the keyboard. The knob slides, at once under reduced motion."
        >
          <Card>
            <Switch label="Dźwięk" checked={sound} onChange={setSound} />
            <Switch label="Tryb nocny" checked={night} onChange={setNight} />
          </Card>
        </Sub>
        <Sub
          title="Segmented control"
          lead="Two to four short choices in one row. More, or long labels, take a radio group."
        >
          <Card>
            <SegmentedControl
              label="Poziom"
              value={level}
              onChange={setLevel}
              options={[
                { value: "easy", label: "Łatwe" },
                { value: "medium", label: "Średnie" },
                { value: "hard", label: "Trudne" },
              ]}
            />
            <SegmentedControl
              label="Full width"
              full
              value={level}
              onChange={setLevel}
              options={[
                { value: "easy", label: "Łatwe" },
                { value: "medium", label: "Średnie" },
                { value: "hard", label: "Trudne" },
              ]}
            />
          </Card>
        </Sub>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Sub
          title="Tabs"
          lead="Notebook dividers for two views of one thing. The active tab joins its page. Arrows move between tabs, Home and End jump. Never a score."
        >
          <Tabs
            label="Przedmiot"
            value={subject}
            onChange={setSubject}
            tabs={[
              {
                value: "maths",
                label: "Matematyka",
                icon: <Calculator aria-hidden className="size-5" />,
                panel: <p>Tabliczka mnożenia: 6 tematów.</p>,
              },
              {
                value: "polish",
                label: "Polski",
                icon: <BookOpen aria-hidden className="size-5" />,
                panel: <p>Ó czy u: 4 tematy.</p>,
              },
            ]}
          />
        </Sub>
        <Sub
          title="Side menu"
          lead="For topic lists, settings and docs. Section headings, categories that fold open onto a margin line, then pages: three levels at most. The current page wears the pick, and its category turns bold and stays open."
        >
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16rem),1fr))]">
            <SideMenu
              label="Ustawienia"
              title="Ustawienia"
              current={page}
              onPick={setPage}
              items={[
                { id: "sound", label: "Dźwięk", icon: <Volume2 aria-hidden className="size-5" /> },
                { id: "look", label: "Wygląd", icon: <Palette aria-hidden className="size-5" /> },
                { id: "night", label: "Noc", icon: <Moon aria-hidden className="size-5" /> },
              ]}
            />
            <SideMenu
              label="System"
              current={doc}
              onPick={setDoc}
              items={[
                { heading: "Podstawy" },
                { id: "kolory", label: "Kolory" },
                { id: "typografia", label: "Typografia" },
                { id: "odstepy", label: "Odstępy" },
                { heading: "Komponenty" },
                {
                  id: "przyciski",
                  label: "Przyciski",
                  items: [
                    { id: "rodzaje", label: "Rodzaje" },
                    { id: "rozmiary", label: "Rozmiary" },
                  ],
                },
                {
                  id: "formularze",
                  label: "Formularze",
                  items: [
                    { id: "radio", label: "Pola wyboru" },
                    { id: "segmenty", label: "Segmenty" },
                    { id: "przelacznik", label: "Przełącznik" },
                  ],
                },
                {
                  id: "nawigacja",
                  label: "Nawigacja",
                  items: [
                    { id: "karty", label: "Karty" },
                    { id: "menu", label: "Menu boczne" },
                  ],
                },
              ]}
            />
          </div>
        </Sub>
      </div>
    </div>
  );
}
