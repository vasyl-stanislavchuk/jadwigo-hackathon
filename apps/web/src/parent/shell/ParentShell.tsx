/**
 * The signed-in parent's app frame (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-
 * column-lesson-workspac, dl-xo0q; handoff §2.1, docs/worklog/dl-uukj.47):
 *
 *   ┌──────────────┬───────────────────────────────────┐
 *   │ logo         │ breadcrumb                account │ ← one 56 px line across
 *   ├──────────────┼───────────────────────────────────┤
 *   │ sidebar      │ the page                          │
 *   │ [▯] Zwiń menu│                                   │
 *   └──────────────┴───────────────────────────────────┘
 *     232, folds to 60
 *
 * On the adult kit (dl-uukj.47.67 §8, §9): the sidebar on the stone fill, the top bar holding the
 * breadcrumb and, in its right corner, the account menu (the page's language and signing out,
 * S10). The sidebar's foot holds the fold button only. On a phone the sidebar is a drawer from the
 * left, opened by the bar's burger, with the account at its foot. N, pressed outside a field, opens
 * a new lesson (D8). The sidebar's fold is remembered per device (fold.ts). Everything inside
 * draws in the parent's density.
 */

import type { Learner } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import {
  Breadcrumb,
  type Crumb,
  cn,
  DensityScope,
  PanelToggle,
  Sheet,
  SheetContent,
  SheetTitle,
} from "@jadwigo/ui";
import { MenuIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { navigate, useLocation } from "../../nav/location.ts";
import { CATEGORY, pageLang } from "../adult.ts";
import { parentPath } from "../route.ts";
import { usePanel } from "./fold.ts";
import {
  Account,
  FoldButton,
  LogoRow,
  NEW_LESSON_KEY,
  type Place,
  SidebarBody,
  SidebarRail,
} from "./Sidebar.tsx";

/** Whether a key press belongs to what holds the focus: a field, a menu or a dialog. */
const ownsKeys = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.closest("input, textarea, select, [role=dialog], [role=menu], [role=listbox]") !== null);

const SIDEBAR_ID = "parent-sidebar";

export function ParentShell({
  language,
  learners,
  place,
  hasLessons = false,
  trail,
  onAddChild,
  onSignOut,
  barLead,
  barEnd,
  children,
}: {
  language: Language;
  learners: readonly Learner[];
  place: Place;
  /** Whether the family has a lesson yet: a live conversation (dl-uukj.47.9). */
  hasLessons?: boolean;
  /** The top bar's breadcrumb: the section, then the page. */
  trail: readonly Crumb[];
  onAddChild: () => void;
  onSignOut: () => void;
  /** What leads the top bar before the breadcrumb, such as the lesson chat's fold button. */
  barLead?: ReactNode;
  /** What stands at the bar's right, before the account, such as "Pokaż lekcję". */
  barEnd?: ReactNode;
  children: ReactNode;
}): ReactElement {
  const [open, setOpen] = usePanel("sidebar");
  const [drawer, setDrawer] = useState(false);
  const t = (key: Parameters<typeof copy>[1]): string => copy(language, key, {}, CATEGORY);
  const sidebar = { language, learners, place, hasLessons, onAddChild };

  // A move to another page closes the phone's drawer.
  const { path } = useLocation();
  useEffect(() => {
    if (path !== "") setDrawer(false);
  }, [path]);

  // N opens a new lesson from anywhere a key press is not someone else's (D8).
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key.toUpperCase() !== NEW_LESSON_KEY || event.repeat || event.defaultPrevented)
        return;
      if (event.metaKey || event.ctrlKey || event.altKey || ownsKeys(event.target)) return;
      event.preventDefault();
      navigate(parentPath({ lang: pageLang() }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <DensityScope
      value="parent"
      className="flex h-dvh bg-jw-ground text-jw-page-body leading-jw-page text-jw-ink"
    >
      <aside
        id={SIDEBAR_ID}
        data-sidebar={open ? "open" : "folded"}
        className={cn(
          "hidden shrink-0 flex-col border-r-jw border-jw-line bg-jw-side transition-[width] duration-jw-band ease-jw-out lg:flex",
          open ? "w-jw-shell-side" : "w-jw-shell-rail",
        )}
      >
        <LogoRow language={language} folded={!open} />
        {open ? (
          <SidebarBody
            {...sidebar}
            foot={
              <FoldButton
                label={t("parent_menu_fold")}
                controls={SIDEBAR_ID}
                onFold={() => setOpen(false)}
              />
            }
          />
        ) : (
          <SidebarRail
            {...sidebar}
            unfold={
              <PanelToggle
                side="left"
                expanded={false}
                label={t("parent_menu_unfold")}
                controls={SIDEBAR_ID}
                onToggle={() => setOpen(true)}
              />
            }
          />
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-jw-shell-bar shrink-0 items-center gap-2 border-b-jw border-jw-line px-4 lg:px-6"
          data-top-bar
        >
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <button
              type="button"
              aria-label={t("parent_menu_open")}
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="grid size-10 place-items-center rounded-jw-small text-jw-ink-soft hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus lg:hidden"
              data-menu-open
            >
              <MenuIcon aria-hidden className="size-4.5" />
            </button>
            <SheetContent
              side="left"
              closeLabel={t("parent_menu_close")}
              className="w-jw-shell-side gap-0 bg-jw-side p-0"
              aria-describedby={undefined}
              data-drawer
            >
              <SheetTitle className="sr-only">{t("parent_nav_label")}</SheetTitle>
              <LogoRow language={language} folded={false} />
              <SidebarBody
                {...sidebar}
                foot={<Account language={language} onSignOut={onSignOut} />}
              />
            </SheetContent>
          </Sheet>
          {barLead}
          <Breadcrumb
            label={t("parent_breadcrumb_label")}
            trail={trail}
            onNavigate={(href) => navigate(href)}
          />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {barEnd}
            <div className="hidden lg:flex">
              <Account language={language} onSignOut={onSignOut} />
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto" data-shell-page>
          {children}
        </div>
      </div>
    </DensityScope>
  );
}
