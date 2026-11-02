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
 *   foot          the fold button, named "Zwiń menu", and nothing else
 *
 * The account (the page's language and signing out) is a menu in the top bar's right corner, and
 * at the phone drawer's foot. Folded, the sidebar is a 60 px rail: the crown, the menu as icons, a
 * disc per child and the unfold button at its foot. Each icon-only control is named from copy.
 */

import type { Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  cn,
  Disc,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Logo,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@jadwigo/ui";
import {
  BookOpenIcon,
  ChevronDownIcon,
  GlobeIcon,
  HistoryIcon,
  LogOutIcon,
  PanelLeftIcon,
  PlusIcon,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { pickLanguage } from "../../nav/language.ts";
import { LANGUAGES } from "../../nav/location.ts";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { LANGUAGE_NAME } from "../LanguagePick.tsx";
import { childPath, historyPath, lessonsPath, parentPath } from "../route.ts";
import { learnerTone } from "../tone.ts";

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
 * The account in the top bar's right corner (§6.6): the parent's disc and a chevron, opening the
 * page's language (Polski, English; D14) and signing out.
 */
export function Account({
  language,
  onSignOut,
}: {
  language: Language;
  onSignOut: () => void;
}): ReactElement {
  const t = say(language);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("parent_account")}
          className={cn(
            "flex h-8 items-center gap-1 rounded-jw-small px-1 text-jw-ink-soft hover:bg-jw-act-quiet",
            FOCUS,
          )}
          data-account
        >
          <Disc kind="parent" size={24} />
          <ChevronDownIcon aria-hidden className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-jw-shell-side" data-account-menu>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <GlobeIcon aria-hidden />
            {t("parent_page_language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(value) => {
                const picked = LANGUAGES.find((l) => l === value);
                if (picked !== undefined) pickLanguage(picked);
              }}
            >
              {LANGUAGES.map((l) => (
                <DropdownMenuRadioItem key={l} value={l} lang={l}>
                  {t(LANGUAGE_NAME[l])}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
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
      </div>
      {foot !== undefined && <div className="border-t-jw border-jw-line px-3 py-2">{foot}</div>}
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
  unfold,
}: SidebarProps & { unfold: ReactNode }): ReactElement {
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
      </nav>
      <div className="flex w-full justify-center border-t-jw border-jw-line px-2 py-2">
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
