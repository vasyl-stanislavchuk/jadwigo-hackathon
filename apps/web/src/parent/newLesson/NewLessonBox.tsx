/**
 * The parent app's first screen, "Lekcje / Nowa lekcja" (decision 2026-11-01-the-parent-app-is-a-
 * sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q; handoff §5.1, docs/worklog/dl-uukj.47):
 * the question and one box, nothing else (no subtitle, no starters, no consent line). The caret is
 * in the box on load; the placeholder is the only example.
 *
 *   empty   "Zrób lekcję" is quiet, with the reason beside it
 *   ready   text or a photo: the outline turns the focus ink, the button the action, the reason goes;
 *           Enter sends, Shift+Enter makes a new line
 *
 * Under the text: "Dodaj zdjęcie", then "Dla: Bez dziecka ▾", then the reason and the button.
 * Photos (picked, pasted with Ctrl+V or dropped) show as 64 × 80 thumbnails, each with ×. They wait
 * on the upload route (dl-z5ja.11), so `photos` keeps them off until it exists.
 */

import type { Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, cn } from "@jadwigo/ui";
import { ArrowRightIcon, ImagePlusIcon, XIcon } from "lucide-react";
import {
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CATEGORY } from "../adult.ts";
import { DlaSelect } from "./DlaSelect.tsx";

/** What the parent sends: the words, the photos, and the child the lesson is for (or none). */
export interface LessonAsk {
  text: string;
  photos: readonly File[];
  learner: LearnerId | null;
}

interface Photo {
  file: File;
  url: string;
}

const images = (files: Iterable<File>): File[] =>
  [...files].filter((file) => file.type.startsWith("image/"));

export function NewLessonBox({
  language,
  learners,
  forLearner,
  onForChange,
  onAddChild,
  onSend,
  photos: photosOn = false,
  busy = false,
  problem = null,
  initialText = "",
}: {
  language: Language;
  learners: readonly Learner[];
  /** Dla: the child the lesson is for, or null. */
  forLearner: LearnerId | null;
  onForChange: (learner: LearnerId | null) => void;
  /** Opens Dodaj dziecko from Dla's menu. */
  onAddChild: () => void;
  onSend: (ask: LessonAsk) => void;
  /** Whether photos can be added: off until the upload route exists (dl-z5ja.11). */
  photos?: boolean;
  /** The send is on its way: the button says so and takes no second press (dl-z5ja.108). */
  busy?: boolean;
  /** Why the last send did not start, in words, under the box; null for none. */
  problem?: string | null;
  /** The words the box opens with: the parent's own, back after the consent screen. */
  initialText?: string;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [text, setText] = useState(initialText);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const reasonId = useId();
  const ready = text.trim() !== "" || photos.length > 0;

  // The caret is in the box on load.
  useEffect(() => box.current?.focus(), []);

  // Each thumbnail's URL goes when its photo does, and all of them when the screen does.
  const urls = useRef<Photo[]>([]);
  urls.current = photos;
  useEffect(
    () => () => {
      for (const photo of urls.current) URL.revokeObjectURL(photo.url);
    },
    [],
  );

  const add = (files: File[]): void => {
    if (!photosOn || files.length === 0) return;
    setPhotos((now) => [
      ...now,
      ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  };
  const remove = (photo: Photo): void => {
    URL.revokeObjectURL(photo.url);
    setPhotos((now) => now.filter((p) => p !== photo));
  };

  const send = (): void => {
    if (!ready || busy) return;
    onSend({ text: text.trim(), photos: photos.map((p) => p.file), learner: forLearner });
  };
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    send();
  };
  const keys = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  };
  const paste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    const pasted = images(event.clipboardData.files);
    if (!photosOn || pasted.length === 0) return;
    event.preventDefault();
    add(pasted);
  };
  const drop = (event: DragEvent<HTMLFormElement>): void => {
    if (!photosOn) return;
    event.preventDefault();
    add(images(event.dataTransfer.files));
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-10 lg:px-6">
      <h1 className="text-center text-jw-page-question leading-tight font-bold">
        {t("parent_question")}
      </h1>
      <form
        onSubmit={submit}
        onDragOver={(event) => photosOn && event.preventDefault()}
        onDrop={drop}
        data-new-lesson
        data-ready={ready ? "" : undefined}
        className={cn(
          "flex w-full max-w-jw-shell-box flex-col gap-3 rounded-jw-box border-2 bg-jw-card p-4 transition-colors duration-jw-fast",
          ready ? "border-jw-focus" : "border-jw-ink-soft",
        )}
      >
        <textarea
          ref={box}
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={keys}
          onPaste={paste}
          aria-label={t("parent_box_label")}
          placeholder={t("parent_placeholder")}
          className="w-full resize-none bg-transparent text-jw-page-body leading-jw-page text-jw-ink outline-none placeholder:text-jw-placeholder"
          data-ask
        />
        {photos.length > 0 && (
          <ul className="flex flex-wrap gap-2" data-photos>
            {photos.map((photo) => (
              <li key={photo.url} className="relative">
                <img
                  src={photo.url}
                  alt=""
                  className="h-20 w-16 rounded-jw-small border-jw border-jw-line object-cover"
                />
                <button
                  type="button"
                  aria-label={t("parent_remove_photo")}
                  onClick={() => remove(photo)}
                  className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border-jw border-jw-line bg-jw-card text-jw-ink-soft hover:text-jw-ink focus-visible:outline-3 focus-visible:outline-jw-focus"
                >
                  <XIcon aria-hidden className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {photosOn && (
            <>
              <input
                ref={picker}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  add(images(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => picker.current?.click()}
                className="flex min-h-jw-control items-center gap-1.5 rounded-jw-small px-2 text-jw-ink hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus"
                data-attach
              >
                <ImagePlusIcon aria-hidden className="size-4 text-jw-ink-soft" />
                {t("parent_attach")}
              </button>
            </>
          )}
          <DlaSelect
            language={language}
            learners={learners}
            value={forLearner}
            onChange={onForChange}
            onAddChild={onAddChild}
          />
          <span className="flex-1" />
          {!ready && (
            <span id={reasonId} className="text-jw-page-small text-jw-ink-soft" data-reason>
              {t("parent_send_reason")}
            </span>
          )}
          <Button
            type="submit"
            size="control"
            aria-disabled={!ready || busy}
            aria-busy={busy}
            aria-describedby={ready ? undefined : reasonId}
            data-send
          >
            {busy ? t("parent_sending") : t("parent_send")}
            <ArrowRightIcon aria-hidden />
          </Button>
        </div>
      </form>
      {problem !== null && (
        <p role="alert" className="text-jw-ink" data-send-problem>
          {problem}
        </p>
      )}
    </div>
  );
}
