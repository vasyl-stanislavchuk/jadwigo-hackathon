/**
 * The parent app's sidebar (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-
 * lesson-workspac, dl-xo0q; handoff §2.1 and §3, docs/worklog/dl-uukj.47):
 *
 *   logo row      56 px with a 1 px line under it, level with the top bar's, and the fold button
 *   menu          Lekcje, Historia: SideMenu with no border or fill of its own; no "Nowa lekcja"
 *                 item, since a new lesson lives under Lekcje and the breadcrumb says so
 *   empty line    what will appear here, until there is a first lesson
 *   Dzieci        a small heading with a dashed "+" beside it, never a row; a row per child: the
 *                 disc, the name, the class at the end
 *   account       at the foot: the language and signing out
 *
 * Folded, it is a 60 px rail: the crown, the unfold button, the menu as icons, a disc per child and
 * the account. Each icon-only control is named from copy.
 */

import type { Learner, LearnerId } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import {
  Button,
  cn,
  Disc,
  Logo,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SideMenu,
} from "@jadwigo/ui";
import { BookOpenIcon, HistoryIcon, PlusIcon, UserRoundIcon } from "lucide-react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { navigate } from "../../nav/location.ts";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { LanguagePick } from "../LanguagePick.tsx";
import { childPath, historyPath, lessonsPath, parentPath } from "../route.ts";

/** Where in the app the page is, for the menu's and the children's current mark. */
export type Place =
  | { kind: "lessons" }
  | { kind: "history" }
  | { kind: "child"; learner: LearnerId }
  | { kind: "elsewhere" };

export interface SidebarProps {
  language: Language;
  learners: readonly Learner[];
  place: Place;
  /** Whether the family has made a lesson yet: before it, the empty line shows under the menu. */
  hasLessons: boolean;
  onAddChild: () => void;
  onSignOut: () => void;
}

const SECTION =
  "text-jw-page-small leading-tight font-bold tracking-wider text-jw-ink-soft uppercase";

/** The account at the sidebar's foot: a button that opens the language and signing out. */
function Account({
  language,
  onSignOut,
  folded,
}: {
  language: Language;
  onSignOut: () => void;
  folded: boolean;
}): ReactElement {
  const label = copy(language, "parent_account", {}, CATEGORY);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={folded ? label : undefined}
          className={cn(
            "flex min-h-jw-control w-full items-center gap-2 rounded-jw-small px-2 text-left text-jw-ink hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus",
            folded && "justify-center px-0",
          )}
          data-account
        >
          <UserRoundIcon aria-hidden className="size-4 shrink-0 text-jw-ink-soft" />
          {!folded && <span className="truncate">{label}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 gap-3 p-3" data-account-menu>
        <LanguagePick language={language} />
        <Button type="button" variant="outline" size="control" onClick={onSignOut} data-sign-out>
          {copy(language, "parent_sign_out", {}, CATEGORY)}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/** The class a child is in, when the pod knows it. */
const gradeOf = (language: Language, learner: Learner): string | null =>
  learner.school_grade === null
    ? null
    : copy(language, "parent_child_grade", { grade: learner.school_grade }, CATEGORY);

/** One child: the disc, the name and the class, the whole row opening the child's page. */
function ChildRow({
  language,
  learner,
  current,
}: {
  language: Language;
  learner: Learner;
  current: boolean;
}): ReactElement {
  const grade = gradeOf(language, learner);
  return (
    <li>
      <NavLink
        href={childPath({ learner: learner.id, lang: pageLang() })}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex min-h-jw-control items-center gap-2 rounded-jw-small border-jw px-2 focus-visible:outline-3 focus-visible:outline-jw-focus",
          current
            ? "border-jw-pick-edge bg-jw-pick font-bold text-jw-pick-ink"
            : "border-transparent text-jw-ink hover:bg-jw-act-quiet",
        )}
        data-child-row={learner.id}
      >
        <Disc name={learner.first_name} />
        <span className="min-w-0 flex-1 truncate">{learner.first_name}</span>
        {grade !== null && (
          <span className="shrink-0 text-jw-page-small text-jw-ink-soft">{grade}</span>
        )}
      </NavLink>
    </li>
  );
}

/** The "+" beside a section's heading: dashed, 28 square, never a row of the list. */
function AddButton({ label, onAdd }: { label: string; onAdd: () => void }): ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onAdd}
      className="grid size-7 shrink-0 place-items-center rounded-jw-small border-jw border-dashed border-jw-line-strong text-jw-ink-soft hover:border-jw-ink-soft hover:text-jw-ink focus-visible:outline-3 focus-visible:outline-jw-focus"
      data-add-child-button
    >
      <PlusIcon aria-hidden className="size-4" />
    </button>
  );
}

/**
 * SideMenu draws real links; a plain click on one moves inside the app, as NavLink does, so the
 * page and its state stay. A click with a modifier, or one already handled, is the browser's.
 */
function inApp(event: MouseEvent<HTMLElement>): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const href = (event.target as Element).closest("a[href]")?.getAttribute("href");
  if (!href?.startsWith("/")) return;
  event.preventDefault();
  navigate(href);
}

/** The sidebar's open face: its body, under the logo row the shell draws. */
export function SidebarBody({
  language,
  learners,
  place,
  hasLessons,
  onAddChild,
  onSignOut,
}: SidebarProps): ReactElement {
  const t = (key: Parameters<typeof copy>[1]): string => copy(language, key, {}, CATEGORY);
  const lang = pageLang();
  const current = place.kind === "lessons" || place.kind === "history" ? place.kind : "";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5.5 overflow-y-auto px-3 py-5.5">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the links inside take the keys; this only routes their clicks */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: the same: a link's Enter is a click */}
        <div className="flex flex-col gap-1.5" onClick={inApp}>
          <SideMenu
            label={t("parent_nav_label")}
            framed={false}
            current={current}
            items={[
              {
                id: "lessons",
                label: t("parent_nav_lessons"),
                icon: <BookOpenIcon aria-hidden className="size-4" />,
                href: lessonsPath({ lang }),
              },
              {
                id: "history",
                label: t("parent_nav_history"),
                icon: <HistoryIcon aria-hidden className="size-4" />,
                href: historyPath({ lang }),
              },
            ]}
          />
          {!hasLessons && (
            <p className="px-3 text-jw-page-small text-jw-ink-soft" data-menu-empty>
              {t("parent_menu_empty")}
            </p>
          )}
        </div>
        <section aria-labelledby="parent-children" className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 px-2">
            <h2 id="parent-children" className={SECTION}>
              {t("parent_nav_children")}
            </h2>
            <AddButton label={t("parent_add_child")} onAdd={onAddChild} />
          </div>
          {learners.length === 0 ? (
            <p className="px-2 text-jw-page-small text-jw-ink-soft" data-children-hint>
              {t("parent_children_hint")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5" data-children>
              {learners.map((learner) => (
                <ChildRow
                  key={learner.id}
                  language={language}
                  learner={learner}
                  current={place.kind === "child" && place.learner === learner.id}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="border-t-jw border-jw-line px-3 py-2">
        <Account language={language} onSignOut={onSignOut} folded={false} />
      </div>
    </div>
  );
}

/** An icon-only link of the rail, named from copy, marked when it is the current page. */
function RailLink({
  href,
  label,
  current,
  children,
}: {
  href: string;
  label: string;
  current: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <NavLink
      href={href}
      aria-label={label}
      title={label}
      aria-current={current ? "page" : undefined}
      className={cn(
        "grid min-h-jw-control min-w-jw-control place-items-center rounded-jw-small border-jw focus-visible:outline-3 focus-visible:outline-jw-focus",
        current
          ? "border-jw-pick-edge bg-jw-pick text-jw-pick-ink"
          : "border-transparent text-jw-ink-soft hover:bg-jw-act-quiet hover:text-jw-ink",
      )}
    >
      {children}
    </NavLink>
  );
}

/** The sidebar folded to its 60 px rail, under the crown. */
export function SidebarRail({
  language,
  learners,
  place,
  onAddChild,
  onSignOut,
  unfold,
}: SidebarProps & { unfold: ReactNode }): ReactElement {
  const t = (key: Parameters<typeof copy>[1]): string => copy(language, key, {}, CATEGORY);
  const lang = pageLang();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <nav
        aria-label={t("parent_nav_label")}
        className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto py-3"
      >
        {unfold}
        <RailLink
          href={lessonsPath({ lang })}
          label={t("parent_nav_lessons")}
          current={place.kind === "lessons"}
        >
          <BookOpenIcon aria-hidden className="size-4" />
        </RailLink>
        <RailLink
          href={historyPath({ lang })}
          label={t("parent_nav_history")}
          current={place.kind === "history"}
        >
          <HistoryIcon aria-hidden className="size-4" />
        </RailLink>
        <div className="my-2 w-6 border-t-jw border-jw-line" />
        {learners.map((learner) => (
          <RailLink
            key={learner.id}
            href={childPath({ learner: learner.id, lang })}
            label={learner.first_name}
            current={place.kind === "child" && place.learner === learner.id}
          >
            <Disc name={learner.first_name} />
          </RailLink>
        ))}
        <AddButton label={t("parent_add_child")} onAdd={onAddChild} />
      </nav>
      <div className="w-full border-t-jw border-jw-line px-2 py-2">
        <Account language={language} onSignOut={onSignOut} folded />
      </div>
    </div>
  );
}

/** The logo row: 56 px with its line, the logo linking to the first screen. */
export function LogoRow({
  language,
  folded,
  toggle,
}: {
  language: Language;
  folded: boolean;
  toggle?: ReactNode;
}): ReactElement {
  return (
    <div
      className={cn(
        "flex h-jw-shell-bar shrink-0 items-center border-b-jw border-jw-line",
        folded ? "justify-center" : "justify-between pr-2 pl-4",
      )}
    >
      <NavLink
        href={parentPath({ lang: pageLang() })}
        className="rounded-jw-small focus-visible:outline-3 focus-visible:outline-jw-focus"
        data-logo-link
      >
        {folded ? (
          <Logo mark label={copy(language, "parent_new_lesson", {}, CATEGORY)} className="h-5" />
        ) : (
          <Logo className="h-5.5" />
        )}
      </NavLink>
      {toggle}
    </div>
  );
}
