/**
 * The System page's adult overlays (dl-uukj.47.67.2): every overlay and menu of @jadwigo/ui's adult
 * kit, live, inside the adult audience at the parent's density, as the parent app draws them: the
 * tooltip with a shortcut, the account Dropdown Menu with its Język strony submenu, a row's Context
 * Menu, the Alert Dialog for a permanent delete, the Dialog, Popover and Sheet in the adult look, the
 * three toasts, a Kbd, and a disabled action that says why. The playground is the owner's English
 * tool, so the sample words are typed here. Then the form controls (dl-uukj.47.67.3): Field with
 * Input, Textarea and the OTP, Checkbox, Radio Group, Radio Cards, Switch, Select, the Dla Combobox,
 * the segmented and rating Toggle Groups, and the underlined Tabs.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
  Button,
  Checkbox,
  Combobox,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DensityScope,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  DisabledReason,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Field,
  Input,
  InputOtp,
  Kbd,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioCards,
  RadioGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
  showToast,
  Tabs,
  Textarea,
  Toaster,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@jadwigo/ui";
import {
  ArchiveIcon,
  ChevronDownIcon,
  Globe,
  LogOut,
  MoreHorizontal,
  Plus,
  Settings,
} from "lucide-react";
import { type ReactNode, useState } from "react";

function Demo({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-jw-page-small font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

function AccountMenu(): JSX.Element {
  const [lang, setLang] = useState("pl");
  const [dense, setDense] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="control">
          Konto
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-58">
        <DropdownMenuLabel>
          <span className="block text-jw-page-body text-foreground">Anna Kowalska</span>
          anna@example.com
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings aria-hidden="true" />
          Ustawienia
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem checked={dense} onCheckedChange={setDense}>
          Gęsto
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe aria-hidden="true" />
            Język strony
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
              <DropdownMenuRadioItem value="pl">Polski</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut aria-hidden="true" />
          Wyloguj się
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Toasts(): JSX.Element {
  return (
    <>
      <Button
        variant="outline"
        size="control"
        onClick={() =>
          showToast({ kind: "done", text: "Lekcja gotowa. Marta zobaczy ją po zalogowaniu." })
        }
      >
        Zrobione
      </Button>
      <Button
        variant="outline"
        size="control"
        onClick={() =>
          showToast({
            kind: "undo",
            text: "Lekcja przeniesiona do archiwum.",
            icon: <ArchiveIcon aria-hidden="true" />,
            action: { label: "Cofnij", onClick: () => undefined },
          })
        }
      >
        Do cofnięcia
      </Button>
      <Button
        variant="outline"
        size="control"
        onClick={() =>
          showToast({
            kind: "failed",
            text: "Nie udało się zapisać lekcji.",
            action: { label: "Spróbuj ponownie", onClick: () => undefined },
            closeLabel: "Zamknij",
          })
        }
      >
        Nie wyszło
      </Button>
    </>
  );
}

const KIDS = [
  { value: "none", label: "Bez dziecka" },
  { value: "marta", label: "Marta", grade: 2 },
  { value: "ola", label: "Ola", grade: 1 },
  { value: "kuba", label: "Kuba", grade: 3 },
];

const GRADES = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: `${n} klasa`,
  hint: `${n + 6}–${n + 7} lat`,
}));

function Forms(): JSX.Element {
  const [name, setName] = useState("");
  const [code, setCode] = useState("12");
  const [dla, setDla] = useState("marta");
  const [grade, setGrade] = useState<string | undefined>("2");
  const [where, setWhere] = useState("screen");
  const [tab, setTab] = useState("overview");
  return (
    <>
      <Demo title="Field, Input, Textarea, OTP">
        <div className="flex w-full flex-col gap-4">
          <Field label="Imię" description="Tak, jak dziecko je zna.">
            <Input
              kind="text"
              placeholder="np. Marta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Imię" problem="Wpisz imię, żeby dziecko je rozpoznało.">
            <Input kind="text" />
          </Field>
          <Textarea aria-label="Czego ma się uczyć?" placeholder="Napisz, czego dziecko się uczy" />
          <InputOtp aria-label="Kod z e-maila" value={code} onChange={setCode} />
        </div>
      </Demo>

      <Demo title="Checkbox, Radio Group, Switch">
        <div className="flex w-full flex-col gap-3">
          <Label className="flex items-center gap-2">
            <Checkbox defaultChecked /> Marta
          </Label>
          <Label className="flex items-center gap-2">
            <Checkbox checked="indeterminate" /> Wszystkie
          </Label>
          <RadioGroup
            label="Gdzie"
            value={where}
            onChange={setWhere}
            options={[
              { value: "screen", label: "Na ekranie", hint: "Na tym komputerze" },
              { value: "paper", label: "Na papierze", hint: "Wydrukuj kartę" },
            ]}
          />
          <Switch defaultChecked>Przypomnienia</Switch>
        </div>
      </Demo>

      <Demo title="Radio Cards (compact, as in Dodaj dziecko)">
        <RadioCards
          label="Klasa"
          options={GRADES}
          value={grade}
          onChange={setGrade}
          compact
          className="w-full"
        />
      </Demo>

      <Demo title="Select and the Dla Combobox">
        <Select defaultValue="pl">
          <SelectTrigger aria-label="Język lekcji" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pl">Polski</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
        <Combobox
          label="Dla"
          options={KIDS}
          value={dla}
          onChange={setDla}
          renderValue={(o) => (
            <>
              <span className="text-muted-foreground">Dla</span>
              <span className="font-medium">{o?.label}</span>
            </>
          )}
          renderOption={(o) => (
            <span className="flex flex-col">
              <span>{o.label}</span>
              {"grade" in o && (
                <span className="text-jw-page-small text-muted-foreground">klasa {o.grade}</span>
              )}
            </span>
          )}
          footer={{
            label: (
              <>
                <Plus aria-hidden="true" /> Dodaj dziecko…
              </>
            ),
            onSelect: () => undefined,
          }}
        />
      </Demo>

      <Demo title="Toggle Group: segmented and rating">
        <ToggleGroup type="single" kind="segment" defaultValue="week" aria-label="Okres">
          <ToggleGroupItem value="week">Tydzień</ToggleGroupItem>
          <ToggleGroupItem value="month">Miesiąc</ToggleGroupItem>
          <ToggleGroupItem value="year">Rok</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single" kind="rating" defaultValue="right" aria-label="Jak trudna?">
          <ToggleGroupItem value="easy">Za łatwa</ToggleGroupItem>
          <ToggleGroupItem value="right">W sam raz</ToggleGroupItem>
          <ToggleGroupItem value="hard">Za trudna</ToggleGroupItem>
        </ToggleGroup>
      </Demo>

      <Demo title="Tabs, underlined">
        <Tabs
          label="Strona dziecka"
          className="w-full"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "overview", label: "Przegląd", panel: "Tydzień Marty." },
            { value: "goals", label: "Cele", panel: "Cele." },
            { value: "report", label: "Raport", panel: "Raport." },
            { value: "lessons", label: "Lekcje", count: 12, panel: "12 lekcji." },
          ]}
        />
      </Demo>
    </>
  );
}

export function AdultKitA(): JSX.Element {
  return (
    <DensityScope value="parent">
      <div data-audience="adult" className="grid gap-4 bg-background p-4 md:grid-cols-2">
        <Demo title="Tooltip and Kbd">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="control" className="px-2">
                <Plus aria-hidden="true" />
                <span className="sr-only">Nowa lekcja</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent shortcut="N">Nowa lekcja</TooltipContent>
          </Tooltip>
          <span className="flex items-center gap-1 text-jw-page-small text-muted-foreground">
            Skrót <Kbd>N</Kbd>
          </span>
        </Demo>

        <Demo title="Disabled, with its reason">
          <DisabledReason reason="Napisz, czego ma się uczyć.">
            <Button size="control">Zrób lekcję</Button>
          </DisabledReason>
        </Demo>

        <Demo title="Dropdown Menu: the account">
          <AccountMenu />
        </Demo>

        <Demo title="Context Menu: right-click the row">
          <ContextMenu>
            <ContextMenuTrigger className="flex w-full items-center justify-between rounded-md border border-border px-3 py-3 text-jw-page-body">
              Dodawanie do 20
              <MoreHorizontal aria-hidden="true" className="size-4 text-muted-foreground" />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>Otwórz</ContextMenuItem>
              <ContextMenuItem>Daj lekcję</ContextMenuItem>
              <ContextMenuItem>Drukuj</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem>
                <ArchiveIcon aria-hidden="true" />
                Archiwizuj
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </Demo>

        <Demo title="Dialog and Alert Dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="control">
                Dodaj dziecko
              </Button>
            </DialogTrigger>
            <DialogContent title="Dodaj dziecko" description="Imię i klasa, nic więcej.">
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" size="control">
                    Anuluj
                  </Button>
                </DialogClose>
                <Button size="control">Dodaj</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="quiet" size="control">
                Usuń na zawsze
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              title="Usunąć Kubę na zawsze?"
              description="Znikną jego lekcje i wyniki. Możesz go zamiast tego zarchiwizować."
            >
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction>Usuń na zawsze</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Demo>

        <Demo title="Popover and Sheet">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="control">
                Popover
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 text-jw-page-body">
              Panel obok przycisku, z cieniem i linią.
            </PopoverContent>
          </Popover>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="control">
                Sheet
              </Button>
            </SheetTrigger>
            <SheetContent side="right" closeLabel="Zamknij">
              <SheetHeader>
                <SheetTitle>Szczegóły</SheetTitle>
                <SheetDescription>Panel z boku.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </Demo>

        <Demo title="Toast: the three kinds">
          <Toasts />
        </Demo>
        <Forms />
        <Toaster label="Powiadomienia" />
      </div>
    </DensityScope>
  );
}
