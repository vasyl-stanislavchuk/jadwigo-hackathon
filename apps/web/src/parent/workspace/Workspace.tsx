/**
 * The lesson workspace (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-
 * lesson-workspac, dl-xo0q; handoff §2.2, docs/worklog/dl-uukj.47):
 *
 *   ┌─ chat 360 ───────┬─ lesson (flex) ──────────────┐
 *   │ messages         │ title                        │ ← shut until "Pokaż lekcję"
 *   │                  │ steps scroll here            │
 *   │ composer         │                              │
 *   └──────────────────┴──────────────────────────────┘
 *
 * The chat is the main view (design review 2026-11-02): the lesson column is shut until the parent
 * opens it with "Pokaż lekcję" in the top bar (LessonToggle). No footer: how and when to
 * give the lesson are the chat's to offer.
 *
 * No details panel (design review 2026-11-02): who the lesson is for and what it practises move
 * into the chat's widgets.
 *
 * The chat has no band of its own: its composer sits at the column's foot, and the run's state is
 * read out from a screen-reader-only slot (design review 2026-11-02).
 *
 * The open chat has no header row: the top bar's line heads it, with its fold button beside the
 * breadcrumb (ChatFoldToggle). The chat folds to a 52 px strip that keeps the unfold button, the panel's name
 * written down its length and one key fact; the parent's choice is remembered per device (the
 * shell's fold.ts). Paper: the lesson column is the page, the chat is a surface.
 * Below lg there is one column and a Rozmowa / Lekcja switch, as ChatScreen has it, with a mark on
 * Lekcja when the lesson changes while the chat is in front. The panes are slots: the engine fills
 * them (dl-z5ja.108).
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, cn, PanelToggle, RegisterProvider } from "@jadwigo/ui";
import { BookOpenIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { CATEGORY } from "../adult.ts";
import { usePanel } from "../shell/fold.ts";
import { INSPECT, useInspector } from "./inspector.ts";

const CHAT_ID = "parent-chat";
const LESSON_ID = "parent-lesson";

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
  bare = false,
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
  /** Open with no header row of its own: its fold button lives elsewhere (the chat's, in the top bar). */
  bare?: boolean;
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
      {open && bare ? (
        <>
          <h2 className="sr-only">{name}</h2>
          {children}
        </>
      ) : open ? (
        <>
          <div
            className={cn(
              // Compact, with a line under it (design review 2026-11-02).
              "flex shrink-0 items-center gap-1 border-b-jw border-jw-line px-1.5 py-0.5",
              side === "right" && "flex-row-reverse",
            )}
          >
            <PanelToggle
              side={side}
              expanded
              label={foldLabel}
              controls={id}
              onToggle={() => onToggle(false)}
              className="min-h-8 min-w-8"
            />
            <h2 className="min-w-0 flex-1 truncate text-jw-page-body leading-tight font-bold">
              {name}
            </h2>
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

/**
 * The chat's fold button for the top bar, beside the breadcrumb: the open chat has no header row,
 * so the bar's line heads it. Desktop only; the phone has its Rozmowa / Lekcja switch.
 */
export function ChatFoldToggle({ language }: { language: Language }): ReactElement | null {
  const [open, setOpen] = usePanel("chat");
  const { isOpen: lessonOpen } = useInspector();
  // Alone, the chat is the page: nothing to fold it beside.
  if (!lessonOpen) return null;
  return (
    <PanelToggle
      side="left"
      expanded={open}
      label={copy(language, open ? "parent_chat_fold" : "parent_chat_unfold", {}, CATEGORY)}
      controls={CHAT_ID}
      onToggle={() => setOpen(!open)}
      className="-ml-2 max-lg:hidden"
    />
  );
}

/**
 * "Pokaż lekcję" / "Ukryj lekcję" in the top bar (design review 2026-11-02): the chat is the main
 * view, and the lesson opens beside it here for a parent who wants to look. Desktop only; the phone
 * has its Rozmowa / Lekcja switch. It goes through the inspector, as the chat's lesson card does, so
 * shutting it also forgets a thing the URL had open (dl-uukj.47.58).
 */
export function LessonToggle({ language }: { language: Language }): ReactElement {
  const inspector = useInspector();
  const open = inspector.isOpen;
  const label = copy(language, open ? "parent_lesson_hide" : "parent_lesson_show", {}, CATEGORY);
  // The kit's secondary (handoff §6.1 names Pokaż lekcję as its use): the chat's send is the one
  // primary in the view.
  return (
    <RegisterProvider value="app">
      <Button
        type="button"
        variant="secondary"
        size="control"
        aria-expanded={open}
        aria-controls={LESSON_ID}
        onClick={() => (open ? inspector.close() : inspector.open(null))}
        className="max-lg:hidden"
        data-lesson-toggle
      >
        <BookOpenIcon aria-hidden />
        {label}
      </Button>
    </RegisterProvider>
  );
}

export function Workspace({
  language,
  chat,
  chatBand,
  chatFact,
  lessonTitle,
  lesson,
  lessonKey,
}: {
  language: Language;
  /** The messages and the composer. */
  chat: ReactNode;
  /** The run's state in words and its live region, for screen readers only: no visible band. */
  chatBand: ReactNode;
  /** What the folded chat's strip says, such as "Układanie lekcji". */
  chatFact?: string;
  lessonTitle: ReactNode;
  /** The steps, scrolling between the title and the footer. */
  lesson: ReactNode;
  /** Changes when the lesson does, so the phone's Lekcja tab can say so while the chat is in front. */
  lessonKey?: string;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [chatOpen, setChatOpen] = usePanel("chat");
  // The chat is the main view (design review 2026-11-02): the lesson opens beside it only when the
  // parent asks, from the top bar (LessonToggle) or a card in the chat (the inspector). With the
  // lesson shut the chat can't fold.
  const { isOpen: lessonOpen } = useInspector();

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
  // A card in the chat opened something: on a phone, the Lekcja pane comes to the front.
  useEffect(() => {
    const on = (): void => {
      setFront("lesson");
      setChanged(false);
    };
    window.addEventListener(INSPECT, on);
    return () => window.removeEventListener(INSPECT, on);
  }, []);

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
              "relative flex min-h-jw-control flex-1 items-center justify-center rounded-jw-control border-jw font-medium transition-colors duration-jw-fast focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
              front === pane
                ? "border-selected-edge bg-selected text-selected-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            data-tab={pane}
          >
            {t(pane === "chat" ? "parent_chat" : "parent_lesson")}
            {pane === "lesson" && changed && (
              <span
                aria-hidden
                className="absolute top-1.5 right-2 size-2 rounded-full bg-primary"
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
          open={chatOpen || !lessonOpen}
          onToggle={setChatOpen}
          name={t("parent_chat")}
          foldLabel={t("parent_chat_fold")}
          unfoldLabel={t("parent_chat_unfold")}
          fact={chatFact}
          width={lessonOpen ? "w-jw-shell-chat" : "flex-1 border-r-0"}
          // No "Rozmowa" row (design review 2026-11-02): the top bar's line is the chat's header,
          // its fold button beside the breadcrumb (ChatFoldToggle), so the new lesson and the
          // chat read as one thing.
          bare
          // On a phone the chat is the whole column while it is in front, and hidden behind the lesson.
          className={cn(
            "max-lg:w-full max-lg:border-r-0",
            front === "chat" ? "max-lg:flex" : "max-lg:hidden",
          )}
        >
          {/* The chat scrolls its own messages, so its composer stays at the foot. */}
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            data-chat-body
            // Alone, the chat keeps a readable column in the middle (chat.css).
            {...(lessonOpen ? {} : { "data-chat-wide": "" })}
          >
            {chat}
          </div>
          {/* No visible band under the chat (design review 2026-11-02): the composer is the column's
              foot. The run's state stays here for screen readers and its live region. */}
          <div className="sr-only" data-chat-band>
            {chatBand}
          </div>
        </SidePanel>
        <section
          id={LESSON_ID}
          aria-label={t("parent_lesson")}
          className={cn(
            "flex min-w-0 flex-1 flex-col bg-jw-ground",
            front === "lesson" ? "max-lg:flex" : "max-lg:hidden",
            !lessonOpen && "lg:hidden",
          )}
          data-lesson-column
        >
          <div className="shrink-0 px-6 pt-5 pb-3 text-jw-page-h1 font-bold" data-lesson-title>
            {lessonTitle}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6" data-steps>
            {lesson}
          </div>
        </section>
      </div>
    </div>
  );
}
