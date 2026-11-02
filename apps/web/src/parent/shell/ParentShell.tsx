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
 * The top bar holds the breadcrumb and, in its right corner, the account (the language and
 * signing out). The sidebar's foot holds the fold button only. On a phone the sidebar is a drawer, opened by the one control the bar has there, on
 * its left. The sidebar's fold is remembered per device (fold.ts). Everything inside draws in the
 * parent's density.
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
import { CATEGORY } from "../adult.ts";
import { usePanel } from "./fold.ts";
import { Account, FoldButton, LogoRow, type Place, SidebarBody, SidebarRail } from "./Sidebar.tsx";

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

  return (
    <DensityScope
      value="parent"
      className="flex h-dvh bg-jw-ground text-jw-page-body leading-jw-page text-jw-ink"
    >
      <aside
        id={SIDEBAR_ID}
        data-sidebar={open ? "open" : "folded"}
        className={cn(
          "hidden shrink-0 flex-col border-r-jw border-jw-line bg-jw-ground transition-[width] duration-jw-band ease-jw-out lg:flex",
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
              className="grid min-h-jw-control min-w-jw-control place-items-center rounded-jw-small text-jw-ink-soft hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus lg:hidden"
              data-menu-open
            >
              <MenuIcon aria-hidden className="size-4.5" />
            </button>
            <SheetContent
              side="left"
              closeLabel={t("parent_menu_close")}
              className="w-jw-shell-side gap-0 bg-jw-ground p-0"
              aria-describedby={undefined}
              data-drawer
            >
              <SheetTitle className="sr-only">{t("parent_nav_label")}</SheetTitle>
              <LogoRow language={language} folded={false} />
              <SidebarBody {...sidebar} />
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
            <Account language={language} onSignOut={onSignOut} />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto" data-shell-page>
          {children}
        </div>
      </div>
    </DensityScope>
  );
}
