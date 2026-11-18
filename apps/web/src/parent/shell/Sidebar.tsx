/**
 * The parent app's sidebar on the adult kit (dl-uukj.47.67 §8, D8, S10, S12; decision dl-xo0q as
 * amended by dl-hz9ks):
 *
 *   logo row      56 px with a 1 px line under it, level with the top bar's
 *   menu          rows 34, radius 6, 14/500 on the stone sidebar, the current one on the active
 *                 stone: Lekcje with a trailing ghost "+" (Nowa lekcja, key N; D8), Historia
 *   empty line    what will appear here, until there is a first lesson
 *   Dzieci        a 12/500 muted label with a ghost "+" beside it, never a row; a row per child:
 *                 the disc in the child's tone (D7) and the name
 *   Ustawienia    the same muted label, and a row per settings page (Konto, Język, Zgoda na AI),
 *                 each opening its whole page at /parent/settings/<section>, as a child's row does
 *   foot          the account (the parent's disc, "Konto i ustawienia"), then "Zwiń menu"
 *
 * The account is the one profile button, bottom left everywhere: the open sidebar's foot, the
 * rail's foot and the phone drawer's foot. Its menu lists the settings pages and signing out; the
 * top bar holds no account. Folded, the sidebar is a 60 px rail: the crown, the menu as icons, a
 * disc per child, an icon per settings page, and the account and the unfold button at its foot.
 * Each icon-only control is named from copy.
 */

import type { Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  cn,
  Disc,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Logo,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@jadwigo/ui";
import {
  BookOpenIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  HistoryIcon,
  LogOutIcon,
  PanelLeftIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { navigate } from "../../nav/location.ts";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import {
  childPath,
  historyPath,
  lessonsPath,
  parentPath,
  SETTINGS_SECTIONS,
  type SettingsSection,
  settingsPath,
} from "../route.ts";
import { learnerTone } from "../tone.ts";

/** Where in the app the page is, for the menu's and the children's current mark. */
export type Place =
  | { kind: "lessons" }
  | { kind: "history" }
  | { kind: "child"; learner: LearnerId }
  | { kind: "settings"; section: SettingsSection }
  | { kind: "elsewhere" };

/** Each settings page's name and icon, for its sidebar row, its rail icon and the account menu. */
export const SETTINGS_PAGE: Record<SettingsSection, { name: CopyKey; icon: typeof UserIcon }> = {
  account: { name: "parent_settings_account", icon: UserIcon },
  language: { name: "parent_settings_language", icon: GlobeIcon },
  ai: { name: "parent_settings_ai", icon: ShieldCheckIcon },
};

export interface SidebarProps {
  language: Language;
  learners: readonly Learner[];
  place: Place;
  /** Whether the family has made a lesson yet: before it, the empty line shows under the menu. */
  hasLessons: boolean;
  onAddChild: () => void;
}

/** The key that opens a new lesson from anywhere outside a field (ParentShell listens for it). */
export const NEW_LESSON_KEY = "N";

const FOCUS = "focus-visible:outline-3 focus-visible:outline-jw-focus";
/** A sidebar row: 34, radius 6, 14/500. */
const ROW = cn(
  "flex min-h-jw-control items-center gap-2 rounded-jw-small px-2 text-jw-page-body font-medium text-jw-ink",
  FOCUS,
);
const fill = (current: boolean): string =>
  current ? "bg-jw-side-active" : "hover:bg-jw-side-active";
/** The 24 ghost "+" a row or a group label carries. */
const PLUS = cn(
  "grid size-6 shrink-0 place-items-center rounded-jw-small text-jw-ink-soft hover:bg-jw-act-quiet hover:text-jw-ink",
  FOCUS,
);

const say =
  (language: Language) =>
  (key: CopyKey): string =>
    copy(language, key, {}, CATEGORY);

/**
 * The account, the one profile button, bottom left: the parent's disc and "Konto i ustawienia" as a
 * whole row at the open sidebar's and the drawer's foot, the disc alone on the rail. Its menu opens
 * up (beside the rail), and lists each settings page, then signing out.
 */
export function Account({
  language,
  onSignOut,
  folded = false,
}: {
  language: Language;
  onSignOut: () => void;
  /** On the rail: the disc alone, named from copy, its menu opening to the right. */
  folded?: boolean;
}): ReactElement {
  const t = say(language);
  const lang = pageLang();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {folded ? (
          <button
            type="button"
            aria-label={t("parent_account")}
            title={t("parent_account")}
            className={cn(
              "grid min-h-jw-control min-w-jw-control place-items-center rounded-jw-small hover:bg-jw-side-active",
              FOCUS,
            )}
            data-account
          >
            <Disc kind="parent" size={20} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={t("parent_account")}
            className={cn(ROW, "w-full text-left hover:bg-jw-side-active")}
            data-account
          >
            <Disc kind="parent" size={20} />
            <span className="min-w-0 flex-1 truncate">{t("parent_account")}</span>
            <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 text-jw-ink-soft" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={folded ? "right" : "top"}
        align={folded ? "end" : "start"}
        className="w-52"
        data-account-menu
      >
        {SETTINGS_SECTIONS.map((section) => {
          const { name, icon: Icon } = SETTINGS_PAGE[section];
          return (
            <DropdownMenuItem
              key={section}
              onSelect={() => navigate(settingsPath({ section, lang }))}
              data-settings-item={section}
            >
              <Icon aria-hidden />
              {t(name)}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut} data-sign-out>
          <LogOutIcon aria-hidden />
          {t("parent_sign_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Lekcje's "+": a link to the first screen, its tooltip naming it and its key. */
function NewLessonPlus({ language }: { language: Language }): ReactElement {
  const label = say(language)("parent_new_lesson");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          href={parentPath({ lang: pageLang() })}
          aria-label={label}
          aria-keyshortcuts={NEW_LESSON_KEY}
          className={PLUS}
          data-new-lesson
        >
          <PlusIcon aria-hidden className="size-4" />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent shortcut={NEW_LESSON_KEY}>{label}</TooltipContent>
    </Tooltip>
  );
}

/** One child: the disc in the child's tone and the name, the whole row opening the child's page. */
function ChildRow({
  learners,
  learner,
  current,
}: {
  learners: readonly Learner[];
  learner: Learner;
  current: boolean;
}): ReactElement {
  // shortcut: no short state ("2 czekają") on the right yet, the shell has no per-child counts.
  return (
    <li>
      <NavLink
        href={childPath({ learner: learner.id, lang: pageLang() })}
        aria-current={current ? "page" : undefined}
        className={cn(ROW, fill(current))}
        data-child-row={learner.id}
      >
        <Disc name={learner.first_name} tone={learnerTone(learners, learner.id)} size={20} />
        <span className="min-w-0 flex-1 truncate">{learner.first_name}</span>
      </NavLink>
    </li>
  );
}

/** The "+" beside Dzieci: ghost, 24 square, never a row of the list. */
function AddChild({ label, onAdd }: { label: string; onAdd: () => void }): ReactElement {
  return (
    <button type="button" aria-label={label} onClick={onAdd} className={PLUS} data-add-child-button>
      <PlusIcon aria-hidden className="size-4" />
    </button>
  );
}

/** The sidebar's open face: its body, under the logo row the shell draws. */
export function SidebarBody({
  language,
  learners,
  place,
  hasLessons,
  onAddChild,
  foot,
}: SidebarProps & { foot?: ReactNode }): ReactElement {
  const t = say(language);
  const lang = pageLang();
  const onLessons = place.kind === "lessons";
  const onHistory = place.kind === "history";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5.5 overflow-y-auto px-3 py-5.5">
        <div className="flex flex-col gap-1.5">
          <nav aria-label={t("parent_nav_label")}>
            <ul className="flex flex-col gap-0.5">
              <li className={cn("flex items-center rounded-jw-small pr-1.5", fill(onLessons))}>
                <NavLink
                  href={lessonsPath({ lang })}
                  aria-current={onLessons ? "page" : undefined}
                  className={cn(ROW, "min-w-0 flex-1")}
                >
                  <BookOpenIcon aria-hidden className="size-4 shrink-0 text-jw-ink-soft" />
                  {t("parent_nav_lessons")}
                </NavLink>
                <NewLessonPlus language={language} />
              </li>
              <li>
                <NavLink
                  href={historyPath({ lang })}
                  aria-current={onHistory ? "page" : undefined}
                  className={cn(ROW, fill(onHistory))}
                >
                  <HistoryIcon aria-hidden className="size-4 shrink-0 text-jw-ink-soft" />
                  {t("parent_nav_history")}
                </NavLink>
              </li>
            </ul>
          </nav>
          {!hasLessons && (
            <p className="px-2 text-jw-page-small text-jw-ink-soft" data-menu-empty>
              {t("parent_menu_empty")}
            </p>
          )}
        </div>
        <section aria-labelledby="parent-children" className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2 pr-1.5 pl-2">
            <h2 id="parent-children" className="text-jw-page-small font-medium text-jw-ink-soft">
              {t("parent_nav_children")}
            </h2>
            <AddChild label={t("parent_add_child")} onAdd={onAddChild} />
          </div>
          {learners.length === 0 ? (
            <p className="px-2 text-jw-page-small text-jw-ink-soft" data-children-hint>
              {t("parent_children_hint")}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5" data-children>
              {learners.map((learner) => (
                <ChildRow
                  key={learner.id}
                  learners={learners}
                  learner={learner}
                  current={place.kind === "child" && place.learner === learner.id}
                />
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="parent-settings" className="flex flex-col gap-0.5">
          <h2
            id="parent-settings"
            className="pr-1.5 pl-2 text-jw-page-small font-medium text-jw-ink-soft"
          >
            {t("parent_nav_settings")}
          </h2>
          <ul className="flex flex-col gap-0.5" data-settings>
            {SETTINGS_SECTIONS.map((section) => {
              const { name, icon: Icon } = SETTINGS_PAGE[section];
              const current = place.kind === "settings" && place.section === section;
              return (
                <li key={section}>
                  <NavLink
                    href={settingsPath({ section, lang })}
                    aria-current={current ? "page" : undefined}
                    className={cn(ROW, fill(current))}
                    data-settings-row={section}
                  >
                    <Icon aria-hidden className="size-4 shrink-0 text-jw-ink-soft" />
                    <span className="min-w-0 flex-1 truncate">{t(name)}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      {foot !== undefined && (
        <div className="flex flex-col gap-0.5 border-t-jw border-jw-line px-3 py-2">{foot}</div>
      )}
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
        "grid min-h-jw-control min-w-jw-control place-items-center rounded-jw-small text-jw-ink-soft hover:text-jw-ink",
        FOCUS,
        fill(current),
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
  account,
  unfold,
}: SidebarProps & { account: ReactNode; unfold: ReactNode }): ReactElement {
  const t = say(language);
  const lang = pageLang();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <nav
        aria-label={t("parent_nav_label")}
        className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto py-3"
      >
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
            <Disc name={learner.first_name} tone={learnerTone(learners, learner.id)} size={20} />
          </RailLink>
        ))}
        <AddChild label={t("parent_add_child")} onAdd={onAddChild} />
        <div className="my-2 w-6 border-t-jw border-jw-line" />
        {SETTINGS_SECTIONS.map((section) => {
          const { name, icon: Icon } = SETTINGS_PAGE[section];
          return (
            <RailLink
              key={section}
              href={settingsPath({ section, lang })}
              label={t(name)}
              current={place.kind === "settings" && place.section === section}
            >
              <Icon aria-hidden className="size-4" />
            </RailLink>
          );
        })}
      </nav>
      <div className="flex w-full flex-col items-center gap-1.5 border-t-jw border-jw-line px-2 py-2">
        {account}
        {unfold}
      </div>
    </div>
  );
}

/** The open sidebar's fold button at its foot: the panel icon and its name, a whole row. */
export function FoldButton({
  label,
  controls,
  onFold,
}: {
  label: string;
  controls: string;
  onFold: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      aria-expanded
      aria-controls={controls}
      onClick={onFold}
      className={cn(ROW, "w-full text-left hover:bg-jw-side-active")}
      data-fold-sidebar
    >
      <PanelLeftIcon aria-hidden className="size-4 shrink-0 text-jw-ink-soft" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** The logo row: 56 px with its line, the logo linking to the first screen. */
export function LogoRow({
  language,
  folded,
}: {
  language: Language;
  folded: boolean;
}): ReactElement {
  return (
    <div
      className={cn(
        "flex h-jw-shell-bar shrink-0 items-center border-b-jw border-jw-line",
        folded ? "justify-center" : "pr-2 pl-4",
      )}
    >
      <NavLink
        href={parentPath({ lang: pageLang() })}
        className={cn("rounded-jw-small", FOCUS)}
        data-logo-link
      >
        {folded ? (
          <Logo mark label={say(language)("parent_new_lesson")} className="h-5" />
        ) : (
          <Logo className="h-10" />
        )}
      </NavLink>
    </div>
  );
}
