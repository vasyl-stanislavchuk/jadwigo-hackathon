/**
 * The System page's adult overlays (dl-uukj.47.67.2): every overlay and menu of @jadwigo/ui's adult
 * kit, live, inside the adult audience at the parent's density, as the parent app draws them: the
 * tooltip with a shortcut, the account Dropdown Menu with its Język strony submenu, a row's Context
 * Menu, the Alert Dialog for a permanent delete, the Dialog, Popover and Sheet in the adult look, the
 * three toasts, a Kbd, and a disabled action that says why. The playground is the owner's English
 * tool, so the sample words are typed here.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
  Button,
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
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  showToast,
  Toaster,
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
        <Toaster label="Powiadomienia" />
      </div>
    </DensityScope>
  );
}
