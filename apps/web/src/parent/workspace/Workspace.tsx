/**
 * The lesson workspace (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-
 * lesson-workspac, dl-xo0q; handoff §2.2, docs/worklog/dl-uukj.47):
 *
 *   ┌─ chat 360 ───────┬─ lesson (flex) ──────────────┬▯┐
 *   │ messages         │ title                        │ │ ← details 290, folded by default
 *   │                  │ steps scroll here            │ │   to its 52 px strip
 *   ├──────────────────┼──────────────────────────────┤ │
 *   │ run state/rating │ status line   [Zapisz] [Daj] │ │ ← one 68 px band under both
 *   └──────────────────┴──────────────────────────────┴─┘
 *
 * Chat and details each fold to a 52 px strip that keeps the unfold button, the panel's name
 * written down its length and one key fact; the parent's choice is remembered per device (the
 * shell's fold.ts). Paper: the lesson column is the page, chat, details and the bands are surfaces.
 * Below lg there is one column and a Rozmowa / Lekcja switch, as ChatScreen has it, with a mark on
 * Lekcja when the lesson changes while the chat is in front. The panes are slots: the engine fills
 * them (dl-z5ja.108).
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { cn, PanelToggle } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { CATEGORY } from "../adult.ts";
import { usePanel } from "../shell/fold.ts";

const CHAT_ID = "parent-chat";
const DETAILS_ID = "parent-details";

/** A side panel: open at its width, or folded to the strip with its name and one key fact. */
function SidePanel({
  id,
  side,
  open,
  onToggle,
  name,
  foldLabel,
  unfoldLabel,
  fact,
  width,
  className,
  children,
}: {
  id: string;
  side: "left" | "right";
  open: boolean;
  onToggle: (open: boolean) => void;
  name: string;
  foldLabel: string;
  unfoldLabel: string;
  /** The one fact the strip keeps, such as the run's state or who the lesson is for. */
  fact?: string | undefined;
  width: string;
  className?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <aside
      id={id}
      aria-label={name}
      data-panel={open ? "open" : "folded"}
      className={cn(
        "flex shrink-0 flex-col bg-jw-card transition-[width] duration-jw-band ease-jw-out",
        side === "left" ? "border-r-jw" : "border-l-jw",
        "border-jw-line",
        open ? width : "w-jw-shell-strip",
        className,
      )}
    >
      {open ? (
        <>
          <div
            className={cn(
              "flex h-12 shrink-0 items-center gap-2 px-3",
              side === "right" && "flex-row-reverse",
            )}
          >
            <PanelToggle
              side={side}
              expanded
              label={foldLabel}
              controls={id}
              onToggle={() => onToggle(false)}
            />
            <h2 className="min-w-0 flex-1 truncate text-jw-page-h2 font-bold">{name}</h2>
          </div>
          {children}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-3 py-2" data-strip>
          <PanelToggle
            side={side}
            expanded={false}
            label={unfoldLabel}
            controls={id}
            onToggle={() => onToggle(true)}
          />
          <span className="font-bold text-jw-ink [writing-mode:vertical-rl]" data-strip-name>
            {name}
          </span>
          {fact !== undefined && (
            <span
              className="text-jw-page-small text-jw-ink-soft [writing-mode:vertical-rl]"
              data-strip-fact
            >
              {fact}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}

/** A 68 px band at a column's foot, with its line on top: the run state, or the lesson's actions. */
export function Band({
  className,
  children,
  ...props
}: { className?: string; children: ReactNode } & Record<`data-${string}`, string | boolean>) {
  return (
    <div
      className={cn(
        "flex h-jw-shell-band shrink-0 items-center gap-3 border-t-jw border-jw-line bg-jw-card px-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Workspace({
  language,
  chat,
  chatBand,
  chatFact,
  lessonTitle,
  lesson,
  lessonFooter,
  lessonKey,
  details,
  detailsFact,
}: {
  language: Language;
  /** The messages and the composer. */
  chat: ReactNode;
  /** The chat's 68 px band: the run state in words, then the rating. */
  chatBand: ReactNode;
  /** What the folded chat's strip says, such as "Jadwigo pisze lekcję". */
  chatFact?: string;
  lessonTitle: ReactNode;
  /** The steps, scrolling between the title and the footer. */
  lesson: ReactNode;
  /** The lesson's pinned footer: the status line and the actions (LessonFooter). */
  lessonFooter: ReactNode;
  /** Changes when the lesson does, so the phone's Lekcja tab can say so while the chat is in front. */
  lessonKey?: string;
  details: ReactNode;
  /** What the folded details' strip says: who the lesson is for. */
  detailsFact?: string;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [chatOpen, setChatOpen] = usePanel("chat");
  const [detailsOpen, setDetailsOpen] = usePanel("details");

  // The phone's one column: which pane is in front, and a mark when the lesson changed behind.
  const [front, setFront] = useState<"chat" | "lesson">("chat");
  const [changed, setChanged] = useState(false);
  const lastKey = useRef(lessonKey);
  useEffect(() => {
    if (lessonKey === lastKey.current) return;
    lastKey.current = lessonKey;
    if (front === "chat") setChanged(true);
  }, [lessonKey, front]);
  const show = (pane: "chat" | "lesson"): void => {
    setFront(pane);
    if (pane === "lesson") setChanged(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-workspace>
      <div
        role="tablist"
        aria-label={t("parent_workspace_tabs")}
        className="flex shrink-0 gap-1 border-b-jw border-jw-line px-4 py-2 lg:hidden"
      >
        {(["chat", "lesson"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            role="tab"
            aria-selected={front === pane}
            onClick={() => show(pane)}
            className={cn(
              "relative flex min-h-jw-control flex-1 items-center justify-center rounded-jw-small border-jw font-bold",
              front === pane
                ? "border-jw-pick-edge bg-jw-pick text-jw-pick-ink"
                : "border-transparent text-jw-ink-soft hover:bg-jw-act-quiet",
            )}
            data-tab={pane}
          >
            {t(pane === "chat" ? "parent_chat" : "parent_lesson")}
            {pane === "lesson" && changed && (
              <span
                aria-hidden
                className="absolute top-1.5 right-2 size-2 rounded-full bg-jw-act"
                data-changed
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <SidePanel
          id={CHAT_ID}
          side="left"
          open={chatOpen}
          onToggle={setChatOpen}
          name={t("parent_chat")}
          foldLabel={t("parent_chat_fold")}
          unfoldLabel={t("parent_chat_unfold")}
          fact={chatFact}
          width="w-jw-shell-chat"
          // On a phone the chat is the whole column while it is in front, and hidden behind the lesson.
          className={cn(
            "max-lg:w-full max-lg:border-r-0",
            front === "chat" ? "max-lg:flex" : "max-lg:hidden",
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto" data-chat-body>
            {chat}
          </div>
          <Band data-chat-band>{chatBand}</Band>
        </SidePanel>
        <section
          aria-label={t("parent_lesson")}
          className={cn(
            "flex min-w-0 flex-1 flex-col bg-jw-ground",
            front === "lesson" ? "max-lg:flex" : "max-lg:hidden",
          )}
          data-lesson-column
        >
          <div className="shrink-0 px-6 pt-5 pb-3 text-jw-page-h1 font-bold" data-lesson-title>
            {lessonTitle}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6" data-steps>
            {lesson}
          </div>
          {lessonFooter}
        </section>
        <SidePanel
          id={DETAILS_ID}
          side="right"
          open={detailsOpen}
          onToggle={setDetailsOpen}
          name={t("parent_details")}
          foldLabel={t("parent_details_fold")}
          unfoldLabel={t("parent_details_unfold")}
          fact={detailsFact}
          width="w-jw-shell-details"
          className="max-lg:hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{details}</div>
        </SidePanel>
      </div>
    </div>
  );
}
